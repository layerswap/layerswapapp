import { TransferProvider, TransferProps, TransferProgress, ActionMessageType } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { switchChain } from "@wagmi/core"
import { getEvmConfig } from "../../service/getEvmConfig"
import { HyperliquidClient } from "./hyperliquidClient"
import { signSendToEvm, signUsdClassTransfer } from "./withdraw"
import { planWithdrawal } from "./planWithdrawal"
import { resolveHyperliquidConfig, HyperliquidConfig, HYPERLIQUID_DEX_SPOT, HYPERLIQUID_WITHDRAW_HEADROOM, HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS, HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS } from "./constants"
import { resolveHyperliquidError, isUserRejection } from "./resolveError"

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

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

/**
 * Poll the fresh split (uncached) until the chosen source pool covers `required`,
 * or the timeout elapses. Used after a consolidation `usdClassTransfer` to wait
 * for HyperCore to apply the move before signing the withdrawal.
 */
async function pollUntilTargetCovers(
    client: HyperliquidClient,
    nodeUrl: string,
    sourceAddress: string,
    coin: string,
    sourceDex: string,
    required: number,
): Promise<boolean> {
    const deadline = Date.now() + HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
        await sleep(HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS)
        const split = await client.getWithdrawableSplit(sourceAddress, nodeUrl, coin)
        const targetAvailable = sourceDex === HYPERLIQUID_DEX_SPOT ? split.spot : split.perps
        if (targetAvailable >= required) return true
    }
    return false
}

const resolveConfig = (params: TransferProps): HyperliquidConfig | undefined =>
    resolveHyperliquidConfig(params.network?.name, params.networks ?? [], params.destinationNetwork?.name, params.destinationToken?.symbol)

/**
 * The Hyperliquid transfer provider — a standard `TransferProvider` whose `supportsNetwork`
 * matches Hyperliquid. It owns the full withdrawal flow (switch the wallet to the fixed
 * Ethereum signing chain → read the spot/perps split → plan → consolidate via
 * `usdClassTransfer` when neither pool alone covers the amount → sign + submit
 * `sendToEvmWithData`) plus the wagmi-dependent EIP-712 signing, so the widget needs none of
 * this logic. Conforms to the shared contract: returns a tx hash (empty — the backend detects
 * the CCTP deposit, there is no source hash), throws on rejection/failure, and reports
 * prerequisite progress through the generic `onProgress` callback.
 */
export function createHyperliquidTransfer(): TransferProvider {
    const supportsNetwork = (network: Parameters<TransferProvider['supportsNetwork']>[0]) =>
        network.name === KnownInternalNames.Networks.HyperliquidMainnet
        || network.name === KnownInternalNames.Networks.HyperliquidTestnet

    return {
        supportsNetwork,

        async executeTransfer(params: TransferProps, _wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string> {
            const config = getEvmConfig()
            const { token: sourceToken, sourceAddress, depositAddress } = params
            // Verbatim string carries 6dp precision; `params.amount` (number) would round.
            const amount = params.amountExact ?? String(params.amount)
            const hlConfig = resolveConfig(params)
            if (!hlConfig) throw fail('Unsupported network', 'No Hyperliquid route for this destination.')
            if (!sourceAddress) throw fail('No account', 'No connected Hyperliquid account.')
            if (!depositAddress) throw fail('No deposit address', 'Missing destination deposit address.')

            // Both signatures use a fixed Ethereum (mainnet/Sepolia) typed-data domain, so the
            // wallet must be on that chain — wallets reject signing a foreign-domain payload.
            // Switch once up front; a no-op if already there.
            try {
                await switchChain(config, { chainId: hlConfig.signatureChainId })
            } catch (switchErr) {
                if (isUserRejection(switchErr)) throw rejected()
                throw fail('Wrong network', 'Switch your wallet to Ethereum to sign the withdrawal, then try again.')
            }

            const decimals = sourceToken.decimals ?? 6
            const required = Number(amount) + HYPERLIQUID_WITHDRAW_HEADROOM
            const client = new HyperliquidClient()

            // Step 1 — read the fresh on-chain split and decide which pool to withdraw
            // from. If neither pool alone covers it but the combined does, consolidate
            // via `usdClassTransfer` and wait for it to settle.
            const split = await client.getWithdrawableSplit(sourceAddress, hlConfig.nodeUrl, sourceToken.symbol)
            const plan = planWithdrawal(split, required, decimals)
            if (plan.insufficient) {
                throw fail('Insufficient balance', `Your available Hyperliquid balance (${split.combined} ${sourceToken.symbol}) is below ${amount} ${sourceToken.symbol}.`)
            }

            let sourceDex = plan.sourceDex
            let transferNonce: number | undefined

            if (plan.transfer) {
                const fromLabel = plan.transfer.toPerp ? 'Spot' : 'Perps'
                const toLabel = plan.transfer.toPerp ? 'Perps' : 'Spot'
                // Tell the user what they're about to sign (a second, internal-only
                // signature) and let it paint before the wallet prompt opens.
                onProgress?.({
                    title: 'Approve moving your balance',
                    description: `Moving ${plan.transfer.amount} ${sourceToken.symbol} from your Hyperliquid ${fromLabel} balance to ${toLabel} so this withdrawal can be funded. The funds stay on Hyperliquid and there's no fee — you'll approve the withdrawal itself next.`,
                })
                await sleep(50)
                transferNonce = Date.now()
                let signedTransfer: Awaited<ReturnType<typeof signUsdClassTransfer>>
                try {
                    signedTransfer = await signUsdClassTransfer(config, hlConfig, {
                        amount: plan.transfer.amount,
                        toPerp: plan.transfer.toPerp,
                        nonce: transferNonce,
                        account: sourceAddress as `0x${string}`,
                    })
                } catch (signErr) {
                    onProgress?.(undefined)
                    if (isUserRejection(signErr)) throw rejected()
                    throw signErr
                }

                const transferResp = await client.usdClassTransfer(signedTransfer.action, signedTransfer.signature, hlConfig.nodeUrl)
                if (transferResp.status === 'err') {
                    onProgress?.(undefined)
                    const { header, details } = resolveHyperliquidError(transferResp.response)
                    throw fail(header, details)
                }

                onProgress?.({ title: 'Updating your balance', description: 'Applying the move on Hyperliquid. This usually takes a few seconds…' })
                const settled = await pollUntilTargetCovers(client, hlConfig.nodeUrl, sourceAddress, sourceToken.symbol, plan.sourceDex, required)
                onProgress?.(undefined)
                if (!settled) {
                    throw fail('Balance is updating', 'Your funds are moving between your Hyperliquid balances. Please try again in a moment.')
                }
                sourceDex = plan.sourceDex
            }

            // Step 2 — sign + submit the withdrawal (single attempt — signed, time-bound
            // nonce). Keep the withdraw nonce strictly after any consolidation transfer's.
            const time = transferNonce !== undefined ? Math.max(Date.now(), transferNonce + 1) : Date.now()
            let signed: Awaited<ReturnType<typeof signSendToEvm>>
            try {
                signed = await signSendToEvm(config, hlConfig, {
                    destinationRecipient: depositAddress,
                    amount,
                    nonce: time,
                    account: sourceAddress as `0x${string}`,
                    sourceDex,
                })
            } catch (signErr) {
                if (isUserRejection(signErr)) throw rejected()
                throw signErr
            }

            const response = await client.withdraw(signed.action, signed.signature, hlConfig.nodeUrl)
            if (response.status === 'err') {
                const { header, details } = resolveHyperliquidError(response.response)
                throw fail(header, details)
            }

            // No real source tx hash — the backend detects the CCTP deposit on the
            // destination chain. The empty string flips the swap off the withdraw screen;
            // the standard Processing screen then tracks the backend-detected input tx.
            return ''
        },
    }
}
