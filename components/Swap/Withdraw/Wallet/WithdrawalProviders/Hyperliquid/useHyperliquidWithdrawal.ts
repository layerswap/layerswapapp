import { useCallback, useMemo, useRef, useState } from "react";
import { useAccount, useConfig } from "wagmi";
import posthog from "posthog-js";
import { WithdrawPageProps } from "../../Common/sharedTypes";
import resolveError from "../EVMWalletWithdraw/resolveError";
import { resolveHyperliquidError, StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useQueryState } from "@/context/query";
import { useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useBalance } from "@/lib/balances/useBalance";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { HyperliquidClient } from "@/lib/apiClients/hyperliquidClient";
import { getExtendedMapping } from "@/lib/extendedRoutes/registry";
import { resolveHyperliquidConfig } from "@/lib/wallets/hyperliquid/constants";
import { signSendToEvm } from "@/lib/wallets/hyperliquid/withdraw";
import { useExtendedRoutesStore } from "@/stores/extendedRoutesStore";

const HL_EXCEPTION_TYPE = 'Hyperliquid Withdrawal Error'

/** Deposit-action kinds that carry the destination deposit address. */
const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']

const getDepositAddress = (actions: DepositAction[] | undefined): string | undefined =>
    actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))?.to_address

const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
    posthog.captureException(error, {
        $layerswap_exception_type: HL_EXCEPTION_TYPE,
        swapId: ctx.swapId,
        $fromAddress: ctx.fromAddress,
        $toAddress: ctx.toAddress,
    })
}

/**
 * Owns the Hyperliquid withdrawal flow and its UI state. The flow is decomposed
 * into three ordered steps — resolve destination + record, balance preflight,
 * sign + submit — wrapped in a single submit guard. The component that consumes
 * this hook is a thin presentational shell over the returned values.
 */
export function useHyperliquidWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const config = useConfig()
    const { address: activeAddress, chain: activeChain, isConnected } = useAccount()
    const { networks } = useSettingsState()
    const query = useQueryState()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    // Full network (with tokens/node_url) for the shared balance pipeline.
    const sourceNetwork = useMemo(() => source_network?.name ? networks.find(n => n.name === source_network.name) : undefined, [networks, source_network?.name])
    const { mutate: refreshBalance } = useBalance(sourceAddress, sourceNetwork)

    const hlConfig = useMemo(() => resolveHyperliquidConfig(source_network?.name, networks), [source_network?.name, networks])
    const extendedMapping = useMemo(() => getExtendedMapping(source_network?.name, source_token?.symbol), [source_network?.name, source_token?.symbol])
    const isDirect = extendedMapping?.resolveMode(destination_network?.name, destination_token?.symbol) === 'direct'

    const [directRecordId, setDirectRecordId] = useState<string>()
    const recordId = isDirect ? directRecordId : swapId
    const record = useExtendedRoutesStore(s => recordId ? s.records[recordId] : undefined)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)
    // Synchronous double-submit guard: covers the click→re-render gap that the
    // `loading` state can't (two rapid clicks before React swaps the button out).
    const submittingRef = useRef(false)

    // Note: WalletTransferAction (the registry that mounts this step) already keeps
    // the wallet's active account aligned with the selected source account.

    const handleWithdraw = useCallback(async () => {
        if (submittingRef.current) return
        submittingRef.current = true
        setError(undefined)
        setRejected(false)
        setLoading(true)

        // Step 1 — resolve the withdrawal destination + the record to track it under.
        // Direct mode records locally; bridge mode lazily creates the backend swap
        // and withdraws to its deposit address.
        const resolveDestinationAndRecord = async (amount: string): Promise<{ destination: string; recordId: string }> => {
            if (isDirect) {
                if (!destination_address) throw new Error('No destination address')
                const recordId = directRecordId ?? crypto.randomUUID()
                if (!directRecordId) setDirectRecordId(recordId)
                useExtendedRoutesStore.getState().setRecord(recordId, {
                    providerId: extendedMapping!.provider.id,
                    mode: 'direct',
                    extendedNetwork: source_network.name,
                    extendedToken: source_token.symbol,
                    realNetwork: extendedMapping!.real.networkName,
                    realToken: extendedMapping!.real.tokenSymbol,
                    sourceAddress: sourceAddress!,
                    sourceAmount: amount,
                    destinationAddress: destination_address,
                    createdAt: Date.now(),
                })
                return { destination: destination_address, recordId }
            }

            let depositActions = depositActionsResponse
            let activeSwapId = swapId
            if (!swapId || !swapDetails) {
                setSwapId(undefined)
                const swapValues: SwapFormValues = {
                    amount,
                    from: source_network as NetworkRoute,
                    to: destination_network as NetworkRoute,
                    fromAsset: source_token,
                    toAsset: destination_token,
                    refuel,
                    destination_address,
                    depositMethod: 'wallet',
                }
                const newSwap = await createSwap(swapValues, query)
                activeSwapId = newSwap?.swap?.id
                if (!activeSwapId) throw new Error('Swap ID is undefined')
                setSwapId(activeSwapId)
                depositActions = newSwap.deposit_actions
            }
            if (!activeSwapId) throw new Error('Swap ID is undefined')
            const destination = getDepositAddress(depositActions)
            if (!destination) throw new Error('No deposit address')
            return { destination, recordId: activeSwapId }
        }

        // Step 2 — re-read the available balance through the shared balance pipeline
        // (same source as the picker / MinMax) so the numbers can't diverge.
        // Returns false (with a surfaced error) when the preflight can't proceed.
        const preflightBalance = async (amountA: number): Promise<boolean> => {
            const fresh = await refreshBalance()
            if (!fresh) {
                setError({ header: 'Balance check failed', details: 'Could not verify your Hyperliquid balance. Please try again.' })
                return false
            }
            const available = fresh.balances?.find(b => b.token === source_token.symbol)?.amount ?? 0
            if (available < amountA) {
                setError({ header: 'Insufficient balance', details: `Your available Hyperliquid balance (${available} ${source_token.symbol}) is below ${amountA} ${source_token.symbol}.` })
                return false
            }
            return true
        }

        // Step 3 — sign + submit (single attempt — signed, time-bound nonce).
        // Returns false (with surfaced error/rejection) when submission didn't succeed.
        const signAndSubmit = async (destination: string, recordId: string, amount: string): Promise<boolean> => {
            const client = new HyperliquidClient()
            const time = Date.now()
            let signed: Awaited<ReturnType<typeof signSendToEvm>>
            try {
                signed = await signSendToEvm(config, hlConfig!, {
                    destinationRecipient: destination,
                    amount,
                    nonce: time,
                    account: sourceAddress as `0x${string}`,
                })
            } catch (signErr) {
                if (resolveError(signErr) === 'transaction_rejected') {
                    setRejected(true)
                    return false
                }
                throw signErr
            }

            const response = await client.withdraw(signed.action, signed.signature, hlConfig!.nodeUrl)
            if (response.status === 'err') {
                setError(resolveHyperliquidError(response.response))
                logWithdrawalError(new Error(response.response), { swapId: recordId, fromAddress: sourceAddress, toAddress: destination })
                return false
            }

            // Success — record the submission. No SwapCatchup / swapTransactionStore
            // write: there is no real source tx hash, and a fake one would break
            // Processing's tx polling and explorer links.
            useExtendedRoutesStore.getState().setWithdrawal(recordId, {
                submittedAt: time,
                nonce: time,
                amount,
                destination,
            })
            onWalletWithdrawalSuccess?.()
            return true
        }

        try {
            if (!hlConfig) throw new Error('Unsupported Hyperliquid network')
            if (!extendedMapping) throw new Error('No extended route mapping')
            if (!sourceAddress) throw new Error('No connected Hyperliquid account')

            const amount = swapBasicData.requested_amount.toString()
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            const { destination, recordId } = await resolveDestinationAndRecord(amount)
            if (!await preflightBalance(A)) return
            await signAndSubmit(destination, recordId, amount)
        } catch (e) {
            logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
            setError({ header: 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
        } finally {
            setLoading(false)
            submittingRef.current = false
        }
    }, [hlConfig, extendedMapping, sourceAddress, isDirect, directRecordId, destination_address, source_network, source_token, destination_network, destination_token, depositActionsResponse, swapId, swapDetails, refuel, query, config, createSwap, setSwapId, onWalletWithdrawalSuccess, swapBasicData.requested_amount, refreshBalance])

    return {
        handleWithdraw,
        loading,
        error,
        rejected,
        isDirect,
        record,
        hlConfig,
        isConnected,
        wallet,
        activeAddress,
        activeChain,
        sourceAddress,
        networks,
    }
}
