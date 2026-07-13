import { TransferProvider, TransferProps, TransferProgress, Network, ActionMessageType } from "@layerswap/widget/types"
import { Config } from "wagmi"
import { switchChain, getWalletClient } from "@wagmi/core"
import { createPublicClient, decodeAbiParameters, type Hex, type PublicClient, type WalletClient } from "viem"
import resolveChain from "../../evmUtils/resolveChain"
import { resolveFallbackTransport } from "../../evmUtils/resolveTransports"
import { classifyPolymarketFunder, resolvePolymarketHolding } from "./funder"
import { buildDepositWalletBatchRequest, buildDepositWalletDeployRequest, buildPolymarketDepositCalls } from "./depositWithdraw"
import { buildSafeBatchRequest } from "./safeWithdraw"
import { getRelayerNonce, isPolymarketDeployed, submitRelayerTransaction, type RelayerSubmittable } from "./relayerClient"
import {
    POLYMARKET_BATCH_DEADLINE_SECONDS,
    POLYMARKET_CHAIN_ID,
    POLYMARKET_DEPLOY_POLL_INTERVAL_MS,
    POLYMARKET_DEPLOY_POLL_TIMEOUT_MS,
    POLYMARKET_USDC_E_ADDRESS,
    resolvePolymarketConfig,
} from "./constants"
import { resolvePolymarketError, isUserRejection } from "./resolveError"

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

// depositERC20(bytes32 id, address token, address receiver, uint256 amount) — all static.
const DEPOSIT_ERC20_PARAMS = [{ type: 'bytes32' }, { type: 'address' }, { type: 'address' }, { type: 'uint256' }] as const

type DepositoryAction = { tokenContract: string; amountBaseUnits: bigint }

/** Decode the depository `depositERC20` calldata to the real token + amount the deposit
 * pulls — the approve/unwrap legs must move exactly what the deposit consumes. */
function decodeDepositAction(depositCallData: Hex): DepositoryAction | undefined {
    try {
        const [, decodedToken, , amount] = decodeAbiParameters(DEPOSIT_ERC20_PARAMS, `0x${depositCallData.slice(10)}` as Hex)
        const amountBaseUnits = amount as bigint
        if (amountBaseUnits <= 0n) return undefined
        return { tokenContract: decodedToken as string, amountBaseUnits }
    } catch {
        return undefined
    }
}

/** Poll the chain until the just-deployed funder contract has code, or timeout. */
async function pollDeployed(publicClient: PublicClient, address: `0x${string}`): Promise<boolean> {
    const deadline = Date.now() + POLYMARKET_DEPLOY_POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
        await sleep(POLYMARKET_DEPLOY_POLL_INTERVAL_MS)
        const code = await publicClient.getCode({ address }).catch(() => undefined)
        if (code && code !== '0x') return true
    }
    return false
}

/**
 * The Polymarket transfer provider — a standard `TransferProvider` whose `supportsNetwork`
 * matches the synthesized Polymarket source. It owns the full Flow 2 withdrawal (switch the
 * wallet to Polygon → resolve which derived funder holds the collateral → sign ONE gasless
 * `Batch` that unwraps pUSD → USDC.e 1:1 and deposits USDC.e into the Layerswap Depository →
 * submit via the relayer proxy), plus deposit-wallet deploy + the wagmi-dependent EIP-712
 * signing, so the widget needs none of this logic. Conforms to the shared contract: returns a
 * tx hash (empty — the backend detects the depository deposit, there is no source hash),
 * throws on rejection/failure, and reports the deploy prerequisite through `onProgress`.
 *
 * The deposit action carries the Depository address (`depositAddress`) + `depositERC20`
 * calldata (`callData`); the amount + token are decoded from that calldata so all legs agree.
 * The batch of calls is identical across funder types; only the signing/relayer wrapping differs
 * (deposit wallet → EIP-712 `Batch`, legacy Gnosis Safe → `MultiSend` SafeTx). The email/Magic
 * `proxy` funder is not supported — its owner key lives with Magic and can't be connected to sign.
 */
export function createPolymarketTransferProvider(
    config: Config,
    supportsNetwork: (network: Network) => boolean,
): TransferProvider {
    return {
        supportsNetwork,

        async executeTransfer(params: TransferProps, _wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string> {
            const { network, token: sourceToken, sourceAddress, depositAddress, callData } = params
            const pmConfig = resolvePolymarketConfig(network?.name)
            if (!pmConfig) throw fail('Unsupported network', 'No Polymarket route for this destination.')
            if (!sourceAddress) throw fail('No account', 'No connected Polymarket account.')
            if (!depositAddress) throw fail('No deposit address', 'Missing destination depository address.')
            if (!callData) throw fail('Withdrawal failed', 'Missing deposit action data.')

            // The depository deposit is denominated in USDC.e — the token the funder ends up
            // holding after unwrap. Decode the amount + token; bail if anything else.
            const action = decodeDepositAction(callData as Hex)
            if (!action) throw fail('Withdrawal failed', 'No depository deposit action.')
            if (action.tokenContract.toLowerCase() !== POLYMARKET_USDC_E_ADDRESS.toLowerCase()) {
                throw fail('Withdrawal failed', 'Unexpected depository token (expected USDC.e).')
            }
            const amountBaseUnits = action.amountBaseUnits

            // The gasless batch signature is an EIP-712 message on Polygon — keep the wallet on
            // Polygon so the prompt is unambiguous. Switching networks costs no gas.
            try {
                await switchChain(config, { chainId: POLYMARKET_CHAIN_ID })
            } catch (switchErr) {
                if (isUserRejection(switchErr)) throw rejected()
                throw fail('Wrong network', 'Switch your wallet to Polygon to sign the withdrawal, then try again.')
            }

            // Resolve which derived funder holds the collateral, and in which token.
            const chain = resolveChain(network)
            if (!chain) throw fail('Network unavailable', 'Could not connect to Polygon for this withdrawal. Please try again.')
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(network.nodes),
            }) as PublicClient

            const holding = await resolvePolymarketHolding(sourceAddress, publicClient)
            const funder = holding.primary
            if (!funder || holding.total <= 0) {
                const { header, details } = resolvePolymarketError('no polymarket account')
                throw fail(header, details)
            }
            if (funder.raw < amountBaseUnits) {
                throw fail('Insufficient balance', `Your available Polymarket balance (${funder.amount} ${sourceToken.symbol}) is below the withdrawal amount.`)
            }

            // Assemble the batch (unwrap if holding pUSD, then approve + deposit). The calls are
            // identical across funder types; only the signing/relayer wrapping differs.
            const calls = buildPolymarketDepositCalls({
                funderTokenAddress: funder.tokenAddress,
                funderAddress: funder.address,
                amountBaseUnits,
                depository: depositAddress as `0x${string}`,
                depositCallData: callData as Hex,
            })

            const walletClient = await getWalletClient(config, { chainId: POLYMARKET_CHAIN_ID }) as WalletClient | null
            if (!walletClient) throw fail('Wallet unavailable', 'Wallet client unavailable.')

            // A funder surfaced via Polymarket's profile that we couldn't derive is tagged
            // 'unknown' — classify it on-chain now (lazily, only when actually withdrawing).
            let funderType = funder.type
            if (funderType === 'unknown') {
                funderType = await classifyPolymarketFunder(funder.address, sourceAddress, publicClient)
            }

            // Only the deposit wallet and Gnosis Safe funders can be withdrawn from here. The
            // email/Magic `proxy` funder's owner key lives with Magic (can't be connected to
            // sign), and a still-`unknown` funder is a contract type we can't execute.
            if (funderType !== 'deposit' && funderType !== 'safe') {
                throw fail('Unsupported account', 'This Polymarket account type isn’t supported for direct withdrawal. Withdraw via Polymarket, or use an account backed by a browser wallet.')
            }

            const fromEoa = sourceAddress as `0x${string}`
            let buildRequest: () => Promise<RelayerSubmittable>

            if (funderType === 'deposit') {
                // The deposit wallet must exist on-chain (the relayer WALLET submit doesn't
                // deploy) — deploy via WALLET-CREATE and wait for code if it's not there yet.
                const code = await publicClient.getCode({ address: funder.address })
                if (!code || code === '0x') {
                    onProgress?.({ title: 'Setting up your account', description: 'Preparing your Polymarket wallet. This usually takes a few seconds…' })
                    await submitRelayerTransaction(buildDepositWalletDeployRequest(fromEoa))
                    const deployed = await pollDeployed(publicClient, funder.address)
                    onProgress?.(undefined)
                    if (!deployed) throw fail('Setting up your account', 'Your Polymarket wallet is being set up. Please try again in a moment.')
                }
                const nonce = await getRelayerNonce(sourceAddress, 'WALLET')
                const deadline = String(Math.floor(Date.now() / 1000) + POLYMARKET_BATCH_DEADLINE_SECONDS)
                buildRequest = () => buildDepositWalletBatchRequest({ walletClient, fromEoa, depositWallet: funder.address, calls, nonce, deadline })
            } else {
                // Safe (legacy). The relayer requires it to already be deployed; a funder holding
                // a balance effectively always is, so treat "not deployed" as "no account".
                const deployed = await isPolymarketDeployed(funder.address, 'SAFE')
                if (!deployed) {
                    const { header, details } = resolvePolymarketError('no polymarket account')
                    throw fail(header, details)
                }
                const nonce = await getRelayerNonce(sourceAddress, 'SAFE')
                buildRequest = () => buildSafeBatchRequest({ walletClient, fromEoa, safe: funder.address, calls, nonce })
            }

            let request: RelayerSubmittable
            try {
                request = await buildRequest()
            } catch (signErr) {
                if (isUserRejection(signErr)) throw rejected()
                throw signErr
            }

            const submitResponse = await submitRelayerTransaction(request)
            if (!submitResponse?.transactionID) {
                const { header, details } = resolvePolymarketError('Polymarket rejected the withdrawal')
                throw fail(header, details)
            }

            // No real source tx hash — the backend detects the depository deposit. The empty
            // string flips the swap off the withdraw screen; the Processing screen takes over.
            return ''
        },
    }
}
