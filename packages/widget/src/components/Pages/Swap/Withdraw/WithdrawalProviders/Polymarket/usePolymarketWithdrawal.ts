import { useCallback, useEffect, useRef, useState } from "react";
import { WithdrawPageProps } from "../../Wallet/Common/sharedTypes";
import { StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useTransfer } from "@/hooks/useTransfer";
import { ActionMessageType, TransferProgress } from "@/types";
import { NetworkRoute } from "@/Models/Network";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { truncateToDecimals } from "@/components/utils/RoundDecimals";

/** Deposit-action kinds that carry the depository deposit (address + calldata). */
const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']

const getDepositAction = (actions: DepositAction[] | undefined): { depository: string; depositCallData: string } | undefined => {
    const action = actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))
    if (!action?.to_address || !action.call_data) return undefined
    return { depository: action.to_address, depositCallData: action.call_data }
}

const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
    const e = error instanceof Error ? error : new Error(String(error))
    ErrorHandler({
        type: 'SwapWithdrawalError',
        message: e.message,
        name: e.name || 'PolymarketWithdrawalError',
        stack: e.stack,
        cause: e.cause,
        swapId: ctx.swapId,
        fromAddress: ctx.fromAddress,
        toAddress: ctx.toAddress,
    })
}

/**
 * Owns the Polymarket withdrawal flow and its UI state. The chain logic (switch to Polygon,
 * resolve the derived funder, sign the gasless unwrap+deposit batch, submit via the relayer)
 * lives in the wallet package's Polymarket `TransferProvider`, resolved here via `useTransfer()`
 * — the widget keeps only what needs its contexts: lazy swap creation + depository deposit-action
 * resolution, amount validation, UI state, and the success hand-off. On success it records a
 * pending input transaction so the standard Processing screen takes over (no real source hash:
 * the backend detects the depository deposit).
 */
export function usePolymarketWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const { networks, sourceRoutes } = useSettingsState()
    const initialSettings = useInitialSettings()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const { executeTransfer } = useTransfer()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    // Wallet gating derives from the widget wallet abstraction (no wagmi here). The signing
    // network switch to Polygon is handled inside the provider.
    const isConnected = !!wallet
    const activeAddress = wallet?.address

    const [loading, setLoading] = useState(false)
    // Set while the provider surfaces a prerequisite step (e.g. deploying the deposit wallet).
    const [progress, setProgress] = useState<TransferProgress | undefined>()
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)
    // Synchronous double-submit guard: covers the click→re-render gap that `loading` can't.
    const submittingRef = useRef(false)
    // The flow widens the async window (deploy + sign + submit); avoid setting state after unmount.
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const handleWithdraw = useCallback(async () => {
        if (submittingRef.current) return
        submittingRef.current = true
        setError(undefined)
        setRejected(false)
        setLoading(true)

        // Ensure the backend swap exists (created lazily on first click, with use_depository so
        // its deposit action carries the Depository address + depositERC20 calldata) and resolve it.
        const resolveSwapAndDepositAction = async (amount: string): Promise<{ depository: string; depositCallData: string; activeSwapId: string }> => {
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
                const newSwap = await createSwap(swapValues, initialSettings)
                activeSwapId = newSwap?.swap?.id
                if (!activeSwapId) throw new Error('Swap ID is undefined')
                setSwapId(activeSwapId)
                depositActions = newSwap.deposit_actions
            }
            if (!activeSwapId) throw new Error('Swap ID is undefined')
            const action = getDepositAction(depositActions)
            if (!action) throw new Error('No depository deposit action')
            return { ...action, activeSwapId }
        }

        try {
            if (!sourceAddress) throw new Error('No connected Polymarket account')
            if (!source_network || !destination_network || !destination_token) throw new Error('Unsupported Polymarket network')

            const decimals = source_token.decimals ?? 6
            // Normalize to the token's precision (the displayed amount can carry sub-precision
            // float artifacts) rather than rejecting it.
            const amount = truncateToDecimals(swapBasicData.requested_amount.toString().trim(), decimals)
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            const { depository, depositCallData, activeSwapId } = await resolveSwapAndDepositAction(amount)

            // Resolves with a (possibly empty) hash on success; throws on rejection/failure.
            const txHash = await executeTransfer({
                network: source_network,
                token: source_token,
                destinationNetwork: destination_network,
                destinationToken: destination_token,
                networks,
                sourceRoutes,
                sourceAddress,
                depositAddress: depository,
                amount: A,
                amountExact: amount,
                callData: depositCallData,
                selectedWallet: wallet!,
            }, wallet, (info) => { if (mountedRef.current) setProgress(info) })

            if (!mountedRef.current) return

            // Success — hand off to the standard Processing screen by recording a pending input.
            useSwapTransactionStore.getState().setSwapTransaction(activeSwapId, BackendTransactionStatus.Pending, txHash || '')
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            if (!mountedRef.current) return
            // A declined wallet prompt is a user action, not an error to log.
            if ((e as Error)?.name === ActionMessageType.TransactionRejected) {
                setRejected(true)
                return
            }
            logWithdrawalError(e, { swapId, fromAddress: sourceAddress })
            setError({ header: (e as any)?.header ?? 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
        } finally {
            if (mountedRef.current) {
                setLoading(false)
                setProgress(undefined)
            }
            submittingRef.current = false
        }
    }, [sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, networks, sourceRoutes, depositActionsResponse, swapId, swapDetails, refuel, initialSettings, wallet, createSwap, setSwapId, executeTransfer, onWalletWithdrawalSuccess, swapBasicData.requested_amount])

    return {
        handleWithdraw,
        loading,
        progress,
        error,
        rejected,
        isConnected,
        wallet,
        activeAddress,
        sourceAddress,
    }
}
