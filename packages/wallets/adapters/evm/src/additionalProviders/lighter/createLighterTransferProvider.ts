import { ActionMessageType } from "@layerswap/widget-types"
import type {
    AuthorizeWithdrawalProps,
    Network,
    TransferProgress,
    TransferProps,
    TransferProvider,
    WithdrawalAuthorization,
} from "@layerswap/widget-types"
import { Config } from "wagmi"
import { signMessage } from "@wagmi/core"
import {
    checkLighterWithdrawal,
    getLighterRegistration,
    prepareLighterWithdrawal,
    registerLighterKey,
    submitLighterWithdrawal,
} from "./relayClient"
import { resolveLighterConfig } from "./constants"
import { isUserRejection, resolveLighterError } from "./resolveError"

/** Thrown for a user-declined wallet prompt; the widget maps this to a "rejected" UI. */
const rejected = (): Error => {
    const e = new Error('Transaction rejected')
    e.name = ActionMessageType.TransactionRejected
    return e
}

/** A surfaced failure: `message` is the user-facing detail, `header` the title. */
const fail = (header: string, details: string): Error => {
    const e = new Error(details)
        ; (e as any).header = header
    return e
}

const surfaced = (message: string): Error => {
    const { header, details } = resolveLighterError(message)
    return fail(header, details)
}

/**
 * Reject an amount that carries more precision than the token holds. The amount string
 * is signed verbatim and leaves Lighter as-is, so `Number()` silently rounding excess
 * decimals would move a different value than the one shown.
 */
function assertExactAmount(amount: string, decimals: number, symbol: string): void {
    const pattern = decimals > 0 ? new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`) : /^\d+$/
    if (!pattern.test(amount)) throw fail('Invalid amount', `At most ${decimals} decimal places for ${symbol}.`)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) throw fail('Invalid amount', 'Enter an amount greater than zero.')
}

async function signL1Message(config: Config, account: string, message: string): Promise<string> {
    try {
        return await signMessage(config, { account: account as `0x${string}`, message })
    } catch (signErr) {
        if (isUserRejection(signErr)) throw rejected()
        throw signErr
    }
}

/**
 * The Lighter transfer provider — a standard `TransferProvider` whose `supportsNetwork`
 * matches the synthesized Lighter source. It owns the full fast-withdraw flow plus the
 * wagmi-dependent EIP-191 signing, so the widget needs none of this logic.
 *
 * Unlike Hyperliquid/Polymarket the flow straddles swap creation, so it is split across
 * the two `TransferProvider` entry points (see ../README.md for the protocol):
 *
 *  - `authorizeWithdrawal` (PRE-swap) — register the L2 signing key if this wallet has
 *    none (one wallet signature), then preflight bridge liquidity, the account-specific
 *    fee, limits, and balance. Returns the firm fee/net/debit terms plus the relay's
 *    sealed quote token. Running before swap creation is what keeps an unavailable
 *    Lighter bridge from leaving an unfunded swap behind, and lets the swap be created
 *    against the exact net amount.
 *  - `executeTransfer` (POST-swap) — bind that sealed quote to the Layerswap deposit
 *    address, have the wallet sign Lighter's transfer message, and submit.
 *
 * Conforms to the shared contract: returns a tx hash (empty — the backend detects the
 * Arbitrum bridge deposit, there is no source hash) and throws on rejection/failure.
 */
export function createLighterTransferProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean,
): TransferProvider {
    const resolveConfig = (params: Pick<AuthorizeWithdrawalProps, 'network' | 'networks' | 'destinationNetwork' | 'destinationToken' | 'sourceRoutes'>) =>
        // Pass the backend source routes so the destination resolved here matches the one
        // the swap was created/priced against — availability fallback must not diverge.
        resolveLighterConfig(params.network?.name, params.networks ?? [], params.destinationNetwork?.name, params.destinationToken?.symbol, params.sourceRoutes)

    return {
        supportsNetwork,

        async authorizeWithdrawal(params: AuthorizeWithdrawalProps, _wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<WithdrawalAuthorization> {
            const { network, token: sourceToken, sourceAddress, amountExact, amountBasis } = params
            const lighterConfig = resolveConfig(params)
            if (!lighterConfig) throw fail('Unsupported network', 'No Lighter route for this destination.')
            if (!sourceAddress) throw fail('No account', 'No connected Lighter account.')

            assertExactAmount(amountExact, sourceToken.decimals ?? 6, sourceToken.symbol)

            // Step 1 — one-time, gasless registration of this wallet's Lighter L2 signing
            // key. The relay seals the prepared ChangePubKey; the wallet's signature over
            // Lighter's own message is what authorizes it.
            const registration = await getLighterRegistration(network.name, sourceAddress)
            if (!registration.registered) {
                if (!registration.signPayload || !registration.registrationToken) {
                    throw fail('Lighter setup failed', 'Lighter registration payload missing. Please try again.')
                }
                onProgress?.({
                    title: 'Approve Lighter setup',
                    description: "Sign the message to register your Lighter signing key for this wallet. This is a one-time, gasless authorization — you'll approve the withdrawal next.",
                })
                let l1Signature: string
                try {
                    l1Signature = await signL1Message(config, sourceAddress, registration.signPayload.message)
                } finally {
                    onProgress?.(undefined)
                }
                const registered = await registerLighterKey(registration.registrationToken, l1Signature)
                if (!registered.ok) throw surfaced(registered.error || 'Could not register your Lighter signing key.')
            }

            // Step 2 — authenticated preflight: bridge LP availability, the exact
            // account-specific fee, withdrawal limits, and available balance. 'gross' means
            // the amount is the total debit and the bridge receives it minus the fee; 'net'
            // pins what must reach the deposit address and lets the debit absorb the fee.
            const availability = await checkLighterWithdrawal({
                network: network.name,
                l1Address: sourceAddress,
                amount: amountExact,
                amountType: amountBasis ?? 'gross',
            })

            return {
                fee: availability.fee,
                netAmount: availability.netAmount,
                debitAmount: availability.debitAmount,
                authorizationToken: availability.withdrawalQuoteToken,
            }
        },

        async executeTransfer(params: TransferProps, _wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string> {
            const { sourceAddress, depositAddress, authorizationToken } = params
            if (!sourceAddress) throw fail('No account', 'No connected Lighter account.')
            if (!depositAddress) throw fail('No deposit address', 'Missing destination deposit address.')
            if (!authorizationToken) throw fail('Withdrawal failed', 'Missing Lighter authorization. Please try again.')

            // Bind the sealed quote to the Layerswap deposit address. The relay re-checks
            // the fee and refuses if Lighter raised it again since authorization.
            const prepared = await prepareLighterWithdrawal({
                withdrawalQuoteToken: authorizationToken,
                destinationRecipient: depositAddress,
            })

            onProgress?.({
                title: 'Approve Lighter withdrawal',
                description: 'Sign Lighter’s withdrawal message. It binds this withdrawal to the Layerswap deposit address and does not send an Ethereum transaction.',
            })
            let withdrawalSignature: string
            try {
                withdrawalSignature = await signL1Message(config, sourceAddress, prepared.signPayload.message)
            } finally {
                onProgress?.(undefined)
            }

            const result = await submitLighterWithdrawal(prepared.withdrawalToken, withdrawalSignature)
            if (!result.ok) throw surfaced(result.error || 'Lighter rejected the withdrawal.')

            // No real source tx hash — the backend detects the Arbitrum bridge deposit. The
            // empty string flips the swap off the withdraw screen; the standard Processing
            // screen then tracks the backend-detected input tx.
            return ''
        },
    }
}
