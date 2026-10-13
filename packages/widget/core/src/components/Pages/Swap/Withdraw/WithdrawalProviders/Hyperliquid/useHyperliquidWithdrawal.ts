import { isUserRejection } from '@layerswap/wallet-core/errors';
import { useCallback, useEffect, useRef, useState } from "react";
import { WithdrawPageProps } from "../../Wallet/Common/sharedTypes";
import { StepError } from "./resolveError";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import useWallet from "@/hooks/useWallet";
import { useTransfer } from "@/hooks/useTransfer";
import { executeWalletOperation } from "@/components/Pages/Swap/Withdraw/Wallet/Common/executeWalletOperation";
import { ActionMessageType, TransferProgress } from "@layerswap/widget-types";
import { NetworkRoute } from "@layerswap/widget-types";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { DepositAction, TransferDepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { executeProviderWithdrawal, getProviderDepositActions } from "../executeProviderWithdrawal";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { useCallbacks } from "@/context/callbackProvider";
import { lifecycleContextFromSwap } from "@/lib/swapLifecycle";

const getDepositAction = (actions: DepositAction[] | undefined): TransferDepositAction | undefined =>
    actions?.find((a): a is TransferDepositAction => a.type === 'transfer' || a.type === 'manual_transfer')

const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
    const e = error instanceof Error ? error : new Error(String(error))
    ErrorHandler({
        type: 'SwapWithdrawalError',
        message: e.message,
        name: e.name || 'HyperliquidWithdrawalError',
        stack: e.stack,
        cause: e,
        swapId: ctx.swapId,
        fromAddress: ctx.fromAddress,
        toAddress: ctx.toAddress,
    })
}

/**
 * Owns the Hyperliquid withdrawal flow and its UI state. The chain logic (switch to the fixed
 * Ethereum signing chain, read the spot/perps split, consolidate, sign + submit) lives in the
 * wallet package's Hyperliquid `TransferProvider`, resolved here via `useTransfer()` — the widget
 * keeps only what needs its contexts: lazy swap creation + deposit-address resolution, amount
 * validation, UI state, and the success hand-off. On success it records a pending input
 * transaction so the standard Processing screen takes over (no real source hash: the backend
 * detects the CCTP deposit on the destination chain).
 *
 * Safe pre-submission retries refresh deposit actions and re-read the balance split.
 * Ambiguous submissions are reconciled against the existing swap before another
 * withdrawal can be considered.
 */
export function useHyperliquidWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const { networks, sourceRoutes } = useSettingsState()
    const initialSettings = useInitialSettings()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails } = useSwapDataState()
    const { createSwap, setSwapId, startFreshSwapAttempt, mutateSwap } = useSwapDataUpdate()
    const { executeTransfer } = useTransfer()
    const { onSwapLifecycle } = useCallbacks()

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    // Wallet gating derives from the widget wallet abstraction (no wagmi here). The signing
    // network switch is handled inside the provider (it switches to a fixed Ethereum chain).
    const isConnected = !!wallet
    const activeAddress = wallet?.address

    const [loading, setLoading] = useState(false)
    // Set while the provider surfaces a prerequisite step (e.g. moving USDC between HL Spot/Perps
    // so the withdrawal can be funded), so the UI can explain the extra wallet signature.
    const [progress, setProgress] = useState<TransferProgress | undefined>()
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)
    // The rejected UI label alone does not establish a user cancellation.
    const lastFailureWasUserRejection = useRef(false)
    // Synchronous double-submit guard: covers the click→re-render gap that `loading` can't.
    const submittingRef = useRef(false)
    // Keep a lazily created swap even before its context state has caught up.
    const preparedSwapRef = useRef<{ swapId: string } | undefined>(undefined)
    // The flow widens the async window (sign + submit + poll); avoid setting state after unmount.
    const mountedRef = useRef(true)
    useEffect(() => {
        mountedRef.current = true
        return () => { mountedRef.current = false }
    }, [])

    const handleWithdraw = useCallback(async () => {
        if (submittingRef.current) return
        if (rejected || error) {
            onSwapLifecycle({
                step: 'retry_requested',
                stage: 'wallet_action',
                outcome: 'started',
                path: 'HyperliquidWithdrawal',
                reasonCode: lastFailureWasUserRejection.current ? 'user_rejected' : 'provider_withdrawal_failed',
                action: 'hyperliquid_withdrawal',
                provider: wallet?.providerName,
                ...lifecycleContextFromSwap(swapBasicData, swapDetails),
                swapId: swapId ?? preparedSwapRef.current?.swapId,
            })
        }
        submittingRef.current = true
        setError(undefined)
        setRejected(false)
        setLoading(true)

        // Keep the swap identity even when its details or deposit actions are missing.
        const resolveSwap = async (amount: string): Promise<{ depositActions?: DepositAction[]; activeSwapId: string }> => {
            let activeSwapId = swapId ?? preparedSwapRef.current?.swapId
            // Only the creation response is fresh for this attempt. Existing swaps
            // fetch current actions in prepare, after the submission guard.
            let depositActions: DepositAction[] | undefined
            if (!activeSwapId) {
                startFreshSwapAttempt()
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
                depositActions = newSwap.deposit_actions
                preparedSwapRef.current = { swapId: activeSwapId }
                setSwapId(activeSwapId)
            }
            if (!activeSwapId) throw new Error('Swap ID is undefined')
            return { depositActions, activeSwapId }
        }

        let lifecycleSwapId = swapId ?? preparedSwapRef.current?.swapId
        try {
            if (!sourceAddress) throw new Error('No connected Hyperliquid account')
            if (!source_network || !destination_network || !destination_token) throw new Error('Unsupported Hyperliquid network')

            if (swapBasicData.requested_amount == null) throw new Error('Invalid amount')
            // The requested amount creates the swap; its deposit action supplies the withdrawal amount.
            const amount = swapBasicData.requested_amount.toString().trim()
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            const { depositActions, activeSwapId } = await resolveSwap(amount)
            lifecycleSwapId = activeSwapId
            await executeProviderWithdrawal({
                swapId: activeSwapId,
                sourceAddress,
                onReconcile: response => mutateSwap(response, false),
                prepare: async () => {
                    const actions = depositActions?.length ? depositActions : await getProviderDepositActions(activeSwapId, sourceAddress)
                    const action = getDepositAction(actions)
                    if (!action?.to_address) throw new Error('No deposit address')
                    if (!action.amount_in_base_units) throw new Error('No withdrawal amount')
                    return action
                },
                execute: (action, onSubmissionStateChange) => executeWalletOperation({
                    context: {
                        ...lifecycleContextFromSwap(swapBasicData, swapDetails),
                        swapId: activeSwapId,
                        path: 'HyperliquidWithdrawal',
                        action: 'hyperliquid_withdrawal',
                        provider: wallet?.providerName,
                    },
                    onLifecycle: onSwapLifecycle,
                    allowEmptyHash: true,
                    isActive: () => mountedRef.current,
                }, () => executeTransfer({
                    swapId: activeSwapId,
                    onSubmissionStateChange,
                    network: source_network,
                    token: action.token ?? source_token,
                    destinationNetwork: destination_network,
                    destinationToken: destination_token,
                    networks,
                    sourceRoutes,
                    sourceAddress,
                    depositAddress: action.to_address,
                    amount: action.amount ?? A,
                    amountInBaseUnits: action.amount_in_base_units,
                    callData: '',
                    selectedWallet: wallet!,
                }, wallet, (info) => { if (mountedRef.current) setProgress(info) })),
            })

            if (!mountedRef.current) return

            // Submission is already recorded, including when no source hash is returned.
            onWalletWithdrawalSuccess?.()
        } catch (e) {
            if (!mountedRef.current) return
            lastFailureWasUserRejection.current = isUserRejection(e)
            // A declined wallet prompt is a user action, not an error to log.
            if (lastFailureWasUserRejection.current) {
                setRejected(true)
                return
            }
            logWithdrawalError(e, { swapId: lifecycleSwapId, fromAddress: sourceAddress })
            // Preserve the provider's UI label even when it cannot establish a cancellation for telemetry.
            if ((e as Error)?.name === ActionMessageType.TransactionRejected) {
                setRejected(true)
            } else {
                setError({ header: (e as any)?.header ?? 'Withdrawal failed', details: (e as Error)?.message || 'Unexpected error occurred.' })
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false)
                setProgress(undefined)
            }
            submittingRef.current = false
        }
    }, [sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, networks, sourceRoutes, swapId, swapDetails, refuel, initialSettings, wallet, createSwap, setSwapId, startFreshSwapAttempt, mutateSwap, executeTransfer, onWalletWithdrawalSuccess, swapBasicData.requested_amount, error, rejected, onSwapLifecycle])

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
