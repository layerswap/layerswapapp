import { TransferProvider, TransferProps, TransferProgress, LayerswapNetwork } from "@layerswap/widget-types";
import { Config } from "wagmi"
import { switchChain, getWalletClient } from "@wagmi/core"
import { createPublicClient, decodeFunctionData, erc20Abi, type Hex, type PublicClient, type WalletClient } from "viem"
import resolveChain from "../../evmUtils/resolveChain"
import { resolveFallbackTransport } from "../../evmUtils/resolveTransports"
import { resolvePolymarketHolding, selectPolymarketFunder } from "./funder"
import { buildDepositWalletBatchRequest, buildDepositWalletDeployRequest, buildPolymarketDepositCalls } from "./depositWithdraw"
import { buildSafeBatchRequest } from "./safeWithdraw"
import { getRelayerNonce, isPolymarketDeployed, submitRelayerTransaction, RelayerNotSubmittedError, type RelayerSubmittable } from "./relayerClient"
import {
    POLYMARKET_BATCH_DEADLINE_SECONDS,
    POLYMARKET_CHAIN_ID,
    POLYMARKET_DEPLOY_POLL_INTERVAL_MS,
    POLYMARKET_DEPLOY_POLL_TIMEOUT_MS,
    POLYMARKET_USDC_E_ADDRESS,
    resolvePolymarketConfig,
} from "./constants"
import { resolvePolymarketError } from "./resolveError"
import { isEvmUserRejection } from "../../evmUtils/resolveError"
import { userRejectedError } from "@layerswap/wallet-core/errors"
import { polymarketWithdrawal } from './withdrawal'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Thrown for a user-declined wallet prompt: rejected UI copy plus the
 * `user_rejected` classification the host and telemetry read. Exported so the
 * mapping is testable without a wallet.
 */
export const rejected = (cause: unknown): Error => userRejectedError({ cause })

/** A surfaced failure: `message` is the user-facing detail, `header` the title. */
const fail = (header: string, details: string): Error => {
    const e = new Error(details)
        ; (e as any).header = header
    return e
}

/** Amount of the backend's USDC.e `transfer` calldata (the swap identifier trails the args). */
function decodeTransferAmount(callData: Hex): bigint | undefined {
    try {
        const { functionName, args } = decodeFunctionData({ abi: erc20Abi, data: callData })
        if (functionName !== 'transfer') return undefined
        const amount = args[1] as bigint
        return amount > 0n ? amount : undefined
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
 * `Batch` that unwraps pUSD → USDC.e 1:1 and transfers USDC.e to Layerswap → submit via the
 * relayer proxy), plus deposit-wallet deploy + the wagmi-dependent EIP-712 signing, so the
 * widget needs none of this logic. Conforms to the shared contract: returns a tx hash (empty —
 * the relayer broadcasts asynchronously, there is no source hash yet), throws on
 * rejection/failure, and reports the deploy prerequisite through `onProgress`.
 *
 * The deposit action is a regular wallet transfer: `depositAddress` is the USDC.e contract and
 * `callData` its `transfer` with the swap identifier; the amount is decoded from that calldata
 * so all legs agree.
 * The batch of calls is identical across funder types; only the signing/relayer wrapping differs
 * (deposit wallet → EIP-712 `Batch`, legacy Gnosis Safe → `MultiSend` SafeTx). The email/Magic
 * `proxy` funder is not supported — its owner key lives with Magic and can't be connected to sign.
 */
export function createPolymarketTransferProvider(
    config: Config,
    supportsNetwork: (network: LayerswapNetwork) => boolean,
): TransferProvider {
    return {
        supportsNetwork,
        withdrawal: polymarketWithdrawal,

        async executeTransfer(params: TransferProps, _wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string> {
            params.onSubmissionStateChange?.('preparing')
            const { network, token: sourceToken, sourceAddress, depositAddress, callData } = params
            const pmConfig = resolvePolymarketConfig(network?.name)
            if (!pmConfig) throw fail('Unsupported network', 'No Polymarket route for this destination.')
            if (!sourceAddress) throw fail('No account', 'No connected Polymarket account.')
            if (!depositAddress || !callData) throw fail('Withdrawal failed', 'Missing deposit action data.')

            // The transfer is denominated in USDC.e — the token the funder ends up holding
            // after unwrap. Bail on any other token or calldata shape.
            if (depositAddress.toLowerCase() !== POLYMARKET_USDC_E_ADDRESS.toLowerCase()) {
                throw fail('Withdrawal failed', 'Unexpected deposit token (expected USDC.e).')
            }
            const amountBaseUnits = decodeTransferAmount(callData as Hex)
            if (!amountBaseUnits) throw fail('Withdrawal failed', 'Unexpected deposit action data.')

            // The gasless batch signature is an EIP-712 message on Polygon — keep the wallet on
            // Polygon so the prompt is unambiguous. Switching networks costs no gas.
            try {
                await switchChain(config, { chainId: POLYMARKET_CHAIN_ID })
            } catch (switchErr) {
                if (isEvmUserRejection(switchErr)) throw rejected(switchErr)
                throw fail('Wrong network', 'Switch your wallet to Polygon to sign the withdrawal, then try again.')
            }

            // Resolve which derived funder holds the collateral, and in which token.
            const chain = resolveChain(network)
            if (!chain) throw fail('Network unavailable', 'Could not connect to Polygon for this withdrawal. Please try again.')
            const publicClient = createPublicClient({
                chain,
                transport: resolveFallbackTransport(network.nodes?.length ? network.nodes : [network.node_url]),
            }) as PublicClient

            const holding = await resolvePolymarketHolding(sourceAddress, publicClient)
            if (holding.entries.length === 0 || holding.total <= 0) {
                const { header, details } = resolvePolymarketError('no polymarket account')
                throw fail(header, details)
            }

            // Pick the source: classify 'unknown' funders on-chain, then take the largest
            // withdrawable (deposit/safe) entry that covers the amount — a bigger balance in
            // an unsupported proxy/unknown funder must not block a withdrawal a supported
            // funder could serve. The email/Magic `proxy` funder's owner key lives with Magic
            // (can't be connected to sign); a still-`unknown` funder we can't execute.
            const { executable, selected: funder } = await selectPolymarketFunder(holding.entries, amountBaseUnits, sourceAddress, publicClient)
            if (executable.length === 0) {
                throw fail('Unsupported account', 'This Polymarket account type isn’t supported for direct withdrawal. Withdraw via Polymarket, or use an account backed by a browser wallet.')
            }
            if (!funder) {
                const largest = executable[0]
                throw fail('Insufficient balance', `Your available Polymarket balance (${largest.amount} ${sourceToken.asset}) is below the withdrawal amount.`)
            }

            // Assemble the batch (unwrap if holding pUSD, then transfer). The calls are
            // identical across funder types; only the signing/relayer wrapping differs.
            const calls = buildPolymarketDepositCalls({
                funderTokenAddress: funder.tokenAddress,
                funderAddress: funder.address,
                amountBaseUnits,
                transferCallData: callData as Hex,
            })

            const walletClient = await getWalletClient(config, { chainId: POLYMARKET_CHAIN_ID }) as WalletClient | null
            if (!walletClient) throw fail('Wallet unavailable', 'Wallet client unavailable.')

            const fromEoa = sourceAddress as `0x${string}`
            let buildRequest: () => Promise<RelayerSubmittable>

            if (funder.type === 'deposit') {
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
                if (isEvmUserRejection(signErr)) throw rejected(signErr)
                throw signErr
            }

            params.onSubmissionStateChange?.('submitting')
            let submitResponse: Awaited<ReturnType<typeof submitRelayerTransaction>>
            try {
                submitResponse = await submitRelayerTransaction(request)
            } catch (error) {
                if (error instanceof RelayerNotSubmittedError) {
                    params.onSubmissionStateChange?.('not_submitted')
                }
                throw error
            }
            if (!submitResponse?.transactionID) {
                const { header, details } = resolvePolymarketError('Polymarket rejected the withdrawal')
                throw fail(header, details)
            }

            // No source tx hash yet — the relayer broadcasts asynchronously. The empty
            // string flips the swap off the withdraw screen; the Processing screen takes over.
            return ''
        },
    }
}
