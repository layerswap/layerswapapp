// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useAccount, useConfig } from "wagmi";
// import posthog from "posthog-js";
// import { WithdrawPageProps } from "../../Common/sharedTypes";
// import resolveError from "../EVMWalletWithdraw/resolveError";
// import { resolveHyperliquidError, StepError } from "./resolveError";
// import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
// import { useWalletWithdrawalState } from "@/context/withdrawalContext";
// import { useSelectedAccount } from "@/context/swapAccounts";
// import { useQueryState } from "@/context/query";
// import { useSettingsState } from "@/context/settings";
// import useWallet from "@/hooks/useWallet";
// import { NetworkRoute } from "@/Models/Network";
// import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
// import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
// import { HyperliquidClient } from "@/lib/apiClients/hyperliquidClient";
// import { resolveHyperliquidConfig, HYPERLIQUID_DEX_SPOT, HYPERLIQUID_WITHDRAW_HEADROOM, HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS, HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS } from "@/lib/wallets/hyperliquid/constants";
// import { signSendToEvm, signUsdClassTransfer } from "@/lib/wallets/hyperliquid/withdraw";
// import { planWithdrawal } from "@/lib/wallets/hyperliquid/planWithdrawal";
// import { useSwapTransactionStore } from "@/stores/swapTransactionStore";

// const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// const HL_EXCEPTION_TYPE = 'Hyperliquid Withdrawal Error'

// /** Deposit-action kinds that carry the destination deposit address. */
// const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']

// const getDepositAddress = (actions: DepositAction[] | undefined): string | undefined =>
//     actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))?.to_address

// const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
//     posthog.captureException(error, {
//         $layerswap_exception_type: HL_EXCEPTION_TYPE,
//         swapId: ctx.swapId,
//         $fromAddress: ctx.fromAddress,
//         $toAddress: ctx.toAddress,
//     })
// }

// const isUserRejection = (err: unknown): boolean => {
//     if (resolveError(err as any) === 'transaction_rejected') return true
//     if (err instanceof Error && /user rejected|user denied|rejected the request/i.test(err.message)) return true
//     const code = (err as any)?.code ?? (err as any)?.cause?.code
//     return code === 4001
// }

// /**
//  * Owns the Hyperliquid withdrawal flow and its UI state. The flow is decomposed
//  * into three ordered steps — resolve the backend swap + deposit address, prepare
//  * the source pool (read the fresh spot/perps split, pick a `sourceDex`, and
//  * consolidate via `usdClassTransfer` when neither pool alone covers the amount),
//  * sign + submit — wrapped in a single submit guard. On success it records a
//  * pending input transaction so the standard Processing screen takes over (no real
//  * source hash: the backend detects the CCTP deposit on Base).
//  *
//  * The flow is idempotent across retries: every attempt re-reads the split, so after
//  * a successful consolidation a retry finds the target pool already covers the amount
//  * and skips straight to the withdraw signature.
//  * The component that consumes this hook is a thin presentational shell.
//  */
// export function useHyperliquidWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
//     const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

//     const config = useConfig()
//     const { address: activeAddress, chain: activeChain, isConnected } = useAccount()
//     const { networks } = useSettingsState()
//     const query = useQueryState()
//     const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
//     const { swapDetails, depositActionsResponse } = useSwapDataState()
//     const { createSwap, setSwapId } = useSwapDataUpdate()

//     const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
//     const { wallets } = useWallet(source_network, "withdrawal")
//     const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
//     const sourceAddress = selectedSourceAccount?.address

//     const hlConfig = useMemo(() => resolveHyperliquidConfig(source_network?.name, networks, destination_network?.name, destination_token?.symbol), [source_network?.name, networks, destination_network?.name, destination_token?.symbol])

//     const [loading, setLoading] = useState(false)
//     // Set while a `usdClassTransfer` consolidation is in flight, so the UI can
//     // explain the extra wallet signature (what's moving, which direction, and which
//     // phase). `step`: 'sign' = awaiting the transfer signature, 'settle' = waiting
//     // for HyperCore to apply it. Undefined when no consolidation is needed.
//     const [consolidation, setConsolidation] = useState<{ amount: string; toPerp: boolean; step: 'sign' | 'settle' } | undefined>()
//     const [error, setError] = useState<StepError | undefined>()
//     const [rejected, setRejected] = useState(false)
//     // Synchronous double-submit guard: covers the click→re-render gap that the
//     // `loading` state can't (two rapid clicks before React swaps the button out).
//     const submittingRef = useRef(false)
//     // Consolidation widens the async window (sign + submit + poll); avoid setting
//     // state after the component unmounts mid-flow.
//     const mountedRef = useRef(true)
//     // Set true in setup (not just false in cleanup): under StrictMode the cleanup
//     // fires once right after mount, which would otherwise leave this false forever.
//     useEffect(() => {
//         mountedRef.current = true
//         return () => { mountedRef.current = false }
//     }, [])

//     // Note: WalletTransferAction (the registry that mounts this step) already keeps
//     // the wallet's active account aligned with the selected source account.

//     const handleWithdraw = useCallback(async () => {
//         if (submittingRef.current) return
//         submittingRef.current = true
//         setError(undefined)
//         setRejected(false)
//         setLoading(true)

//         // Step 1 — ensure the backend swap exists (created lazily on first click)
//         // and resolve its deposit address, which the withdrawal funds.
//         const resolveSwapAndDepositAddress = async (amount: string): Promise<{ destination: string; activeSwapId: string }> => {
//             let depositActions = depositActionsResponse
//             let activeSwapId = swapId
//             if (!swapId || !swapDetails) {
//                 setSwapId(undefined)
//                 const swapValues: SwapFormValues = {
//                     amount,
//                     from: source_network as NetworkRoute,
//                     to: destination_network as NetworkRoute,
//                     fromAsset: source_token,
//                     toAsset: destination_token,
//                     refuel,
//                     destination_address,
//                     depositMethod: 'wallet',
//                 }
//                 const newSwap = await createSwap(swapValues, query)
//                 activeSwapId = newSwap?.swap?.id
//                 if (!activeSwapId) throw new Error('Swap ID is undefined')
//                 setSwapId(activeSwapId)
//                 depositActions = newSwap.deposit_actions
//             }
//             if (!activeSwapId) throw new Error('Swap ID is undefined')
//             const destination = getDepositAddress(depositActions)
//             if (!destination) throw new Error('No deposit address')
//             return { destination, activeSwapId }
//         }

//         // Poll the fresh split (uncached — NOT the React balance store) until the
//         // chosen source pool covers `required`, or we hit the timeout. Bail if the
//         // component unmounts mid-poll — this can run for up to the timeout window,
//         // so the caller must not set state (consolidation/error) on a dead component.
//         const pollUntilTargetCovers = async (client: HyperliquidClient, sourceDex: string, required: number): Promise<boolean> => {
//             const deadline = Date.now() + HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS
//             while (Date.now() < deadline) {
//                 if (!mountedRef.current) return false
//                 await sleep(HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS)
//                 if (!mountedRef.current) return false
//                 const split = await client.getWithdrawableSplit(sourceAddress!, hlConfig!.nodeUrl, source_token.symbol)
//                 const targetAvailable = sourceDex === HYPERLIQUID_DEX_SPOT ? split.spot : split.perps
//                 if (targetAvailable >= required) return true
//             }
//             return false
//         }

//         // Step 2 — read the fresh on-chain spot/perps split and decide which pool to
//         // withdraw from. If neither pool alone covers the amount but the combined
//         // balance does, consolidate via `usdClassTransfer` and wait for it to settle.
//         // Returns the chosen sourceDex (and the transfer nonce, if one was used) or
//         // null (with a surfaced error/rejection) when the source can't be prepared.
//         const prepareSource = async (client: HyperliquidClient, amount: string, activeSwapId: string): Promise<{ sourceDex: string; transferNonce?: number } | null> => {
//             const required = Number(amount) + HYPERLIQUID_WITHDRAW_HEADROOM
//             const split = await client.getWithdrawableSplit(sourceAddress!, hlConfig!.nodeUrl, source_token.symbol)
//             const plan = planWithdrawal(split, required, source_token.decimals)

//             if (plan.insufficient) {
//                 setError({ header: 'Insufficient balance', details: `Your available Hyperliquid balance (${split.combined} ${source_token.symbol}) is below ${amount} ${source_token.symbol}.` })
//                 return null
//             }
//             if (!plan.transfer) return { sourceDex: plan.sourceDex }

//             // Consolidate: move the deficit into the chosen pool first. Tell the user
//             // what they're about to sign (this is a second, internal-only signature),
//             // and let it paint before the wallet prompt opens so they read it first.
//             if (mountedRef.current) setConsolidation({ amount: plan.transfer.amount, toPerp: plan.transfer.toPerp, step: 'sign' })
//             await sleep(50)
//             const transferNonce = Date.now()
//             let signedTransfer: Awaited<ReturnType<typeof signUsdClassTransfer>>
//             try {
//                 signedTransfer = await signUsdClassTransfer(config, hlConfig!, {
//                     amount: plan.transfer.amount,
//                     toPerp: plan.transfer.toPerp,
//                     nonce: transferNonce,
//                     account: sourceAddress as `0x${string}`,
//                 })
//             } catch (signErr) {
//                 if (isUserRejection(signErr)) {
//                     setRejected(true)
//                     return null
//                 }
//                 throw signErr
//             }

//             const transferResp = await client.usdClassTransfer(signedTransfer.action, signedTransfer.signature, hlConfig!.nodeUrl)
//             if (transferResp.status === 'err') {
//                 // Nothing moved — safe to bail.
//                 setError(resolveHyperliquidError(transferResp.response))
//                 logWithdrawalError(new Error(transferResp.response), { swapId: activeSwapId, fromAddress: sourceAddress })
//                 return null
//             }

//             if (mountedRef.current) setConsolidation(prev => prev && { ...prev, step: 'settle' })
//             const settled = await pollUntilTargetCovers(client, plan.sourceDex, required)
//             if (!settled) {
//                 // Unmounted mid-poll → leave state untouched; timed out while mounted → surface the retry hint.
//                 if (mountedRef.current) setError({ header: 'Balance is updating', details: 'Your funds are moving between your Hyperliquid balances. Please try again in a moment.' })
//                 return null
//             }
//             // Transfer applied — drop the consolidation notice so the withdraw step
//             // shows the normal "Withdrawing" copy for its own signature.
//             if (mountedRef.current) setConsolidation(undefined)
//             return { sourceDex: plan.sourceDex, transferNonce }
//         }

//         // Step 3 — sign + submit (single attempt — signed, time-bound nonce).
//         // Returns false (with surfaced error/rejection) when submission didn't succeed.
//         const signAndSubmit = async (client: HyperliquidClient, destination: string, activeSwapId: string, amount: string, sourceDex: string, transferNonce?: number): Promise<boolean> => {
//             // Keep the withdraw nonce strictly after any consolidation transfer's.
//             const time = transferNonce !== undefined ? Math.max(Date.now(), transferNonce + 1) : Date.now()
//             let signed: Awaited<ReturnType<typeof signSendToEvm>>
//             try {
//                 signed = await signSendToEvm(config, hlConfig!, {
//                     destinationRecipient: destination,
//                     amount,
//                     nonce: time,
//                     account: sourceAddress as `0x${string}`,
//                     sourceDex,
//                 })
//             } catch (signErr) {
//                 if (isUserRejection(signErr)) {
//                     setRejected(true)
//                     return false
//                 }
//                 throw signErr
//             }

//             const response = await client.withdraw(signed.action, signed.signature, hlConfig!.nodeUrl)
//             if (response.status === 'err') {
//                 setError(resolveHyperliquidError(response.response))
//                 logWithdrawalError(new Error(response.response), { swapId: activeSwapId, fromAddress: sourceAddress, toAddress: destination })
//                 return false
//             }

//             // Success — hand off to the standard Processing screen by recording a
//             // pending input. There is no real source tx hash (the backend detects
//             // the CCTP deposit on Base), so the hash is left empty; this only flips
//             // the swap off the withdraw screen until the real input tx arrives.
//             useSwapTransactionStore.getState().setSwapTransaction(activeSwapId, BackendTransactionStatus.Pending, '')
//             onWalletWithdrawalSuccess?.()
//             return true
//         }

//         try {
//             if (!hlConfig) throw new Error('Unsupported Hyperliquid network')
//             if (!sourceAddress) throw new Error('No connected Hyperliquid account')

//             // The amount string is signed verbatim into the action and leaves
//             // HyperCore as-is. Reject anything beyond the source token's precision
//             // (USDC = 6 dp): `Number()` silently rounds excess decimals, which on a
//             // signed financial amount would withdraw a different value than shown.
//             const amount = swapBasicData.requested_amount.toString().trim()
//             const decimals = source_token.decimals ?? 6
//             const amountPattern = decimals > 0 ? new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`) : /^\d+$/
//             if (!amountPattern.test(amount)) throw new Error(`Invalid amount — at most ${decimals} decimal places for ${source_token.symbol}`)
//             const A = Number(amount)
//             if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

//             const client = new HyperliquidClient()
//             const { destination, activeSwapId } = await resolveSwapAndDepositAddress(amount)
//             const source = await prepareSource(client, amount, activeSwapId)
//             if (!source) return
//             await signAndSubmit(client, destination, activeSwapId, amount, source.sourceDex, source.transferNonce)
//         } catch (e) {
//             logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
//             setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
//         } finally {
//             setLoading(false)
//             setConsolidation(undefined)
//             submittingRef.current = false
//         }
//     }, [hlConfig, sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, depositActionsResponse, swapId, swapDetails, refuel, query, config, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount])

//     return {
//         handleWithdraw,
//         loading,
//         consolidation,
//         error,
//         rejected,
//         hlConfig,
//         isConnected,
//         wallet,
//         activeAddress,
//         activeChain,
//         sourceAddress,
//     }
// }
