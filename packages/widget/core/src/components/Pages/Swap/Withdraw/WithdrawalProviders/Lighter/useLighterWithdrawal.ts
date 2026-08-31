import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { WithdrawPageProps } from "../../Wallet/Common/sharedTypes";
import { StepError } from "./resolveError";
import { LighterFeeUpdate } from "./FeeUpdate";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useWalletWithdrawalState } from "@/context/withdrawalContext";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useAsyncModal } from "@/context/asyncModal";
import useWallet from "@/hooks/useWallet";
import { useTransfer } from "@/hooks/useTransfer";
import { ActionMessageType } from "@layerswap/widget-types";
import type { NetworkRoute, TransferProgress } from "@layerswap/widget-types";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { BackendTransactionStatus, DepositAction } from "@/lib/apiClients/layerSwapApiClient";
import { useSwapTransactionStore } from "@/stores/swapTransactionStore";
import { useExtendedRoutesStore } from "@/stores/extendedRoutesStore";
import { getExtendedMapping } from "@/lib/extendedRoutes/registry";
import { subtractDecimal } from "@/lib/extendedRoutes/amounts";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { truncateToDecimals } from "@/components/utils/RoundDecimals";

/** Deposit-action kinds that carry the destination deposit address. */
const DEPOSIT_ACTION_TYPES = ['transfer', 'manual_transfer']

const getDepositAddress = (actions: DepositAction[] | undefined): string | undefined =>
    actions?.find(a => DEPOSIT_ACTION_TYPES.includes(a.type))?.to_address

const logWithdrawalError = (error: unknown, ctx: { swapId?: string; fromAddress?: string; toAddress?: string }) => {
    const e = error instanceof Error ? error : new Error(String(error))
    ErrorHandler({
        type: 'SwapWithdrawalError',
        message: e.message,
        name: e.name || 'LighterWithdrawalError',
        stack: e.stack,
        cause: e.cause,
        swapId: ctx.swapId,
        fromAddress: ctx.fromAddress,
        toAddress: ctx.toAddress,
    })
}

/**
 * Owns the Lighter withdrawal flow and its UI state. The chain logic (register the L2
 * signing key, preflight the bridge/fee, bind the sealed quote to the deposit address,
 * sign + submit) lives in the wallet package's Lighter `TransferProvider`, resolved here
 * via `useTransfer()` — the widget keeps only what needs its contexts.
 *
 * Lighter differs from its siblings in one way that shapes this hook: its fee is only
 * knowable after wallet authorization, so the flow is
 * `authorizeWithdrawal` → confirm any fee change → create the swap against the exact net
 * amount → `executeTransfer`. Authorizing first is also what keeps an unavailable Lighter
 * bridge from leaving an unfunded swap behind.
 *
 * On success it records a pending input transaction so the standard Processing screen
 * takes over (no real source hash: the backend detects the Arbitrum bridge deposit).
 */
export function useLighterWithdrawal({ swapBasicData, refuel, swapId }: WithdrawPageProps) {
    const { source_network, source_token, destination_network, destination_token, destination_address } = swapBasicData

    const { networks, sourceRoutes } = useSettingsState()
    const initialSettings = useInitialSettings()
    const { onWalletWithdrawalSuccess } = useWalletWithdrawalState()
    const { swapDetails, depositActionsResponse } = useSwapDataState()
    const { createSwap, setSwapId } = useSwapDataUpdate()
    const { executeTransfer, authorizeWithdrawal } = useTransfer()
    const { getConfirmation } = useAsyncModal()
    const extendedRouteRecord = useExtendedRoutesStore(state => swapId ? state.records[swapId] : undefined)

    const selectedSourceAccount = useSelectedAccount("from", source_network?.name)
    const { wallets } = useWallet(source_network, "withdrawal")
    const wallet = wallets.find(w => w.id === selectedSourceAccount?.id)
    const sourceAddress = selectedSourceAccount?.address

    // Wallet gating derives from the widget wallet abstraction (no wagmi here). The
    // EIP-191 signing prompts are raised inside the provider.
    const isConnected = !!wallet
    const activeAddress = wallet?.address

    const [loading, setLoading] = useState(false)
    // Set while the provider surfaces a prerequisite step (registration / withdrawal signature).
    const [progress, setProgress] = useState<TransferProgress | undefined>()
    const [error, setError] = useState<StepError | undefined>()
    const [rejected, setRejected] = useState(false)
    // Synchronous double-submit guard: covers the click→re-render gap that `loading` can't.
    const submittingRef = useRef(false)
    // The flow widens the async window (authorize + confirm + sign + submit); avoid
    // setting state after unmount.
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

        // Ensure the backend swap exists (created lazily once Lighter's exact fee is known,
        // so it is priced on the amount that will actually arrive) and resolve its deposit
        // address, which the withdrawal funds.
        const resolveSwapAndDepositAddress = async (
            amount: string,
            realAmount: string,
            exactFee: string,
        ): Promise<{ destination: string; activeSwapId: string }> => {
            let depositActions = depositActionsResponse
            let activeSwapId = swapId
            if (!swapId || !swapDetails) {
                setSwapId(undefined)
                const swapValues: SwapFormValues = {
                    amount,
                    extendedRouteOverride: {
                        realAmount,
                        flatFee: Number(exactFee),
                    },
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
            const destination = getDepositAddress(depositActions)
            if (!destination) throw new Error('No deposit address')
            return { destination, activeSwapId }
        }

        try {
            if (!sourceAddress) throw new Error('No connected Lighter account')
            if (!source_network || !source_token || !destination_network || !destination_token) throw new Error('Unsupported Lighter network')
            if (swapBasicData.requested_amount == null) throw new Error('Invalid amount')

            const decimals = source_token.decimals ?? 6
            // Normalize to the token's precision (the displayed amount can carry
            // sub-precision float artifacts) rather than rejecting it.
            const amount = truncateToDecimals(swapBasicData.requested_amount.toString().trim(), decimals)
            const A = Number(amount)
            if (!Number.isFinite(A) || A <= 0) throw new Error('Invalid amount')

            // Resuming an already-created swap: it was priced on the net amount implied by
            // the fee recorded at creation, so authorize on that net figure and let a fee
            // change move the debit instead of shorting the swap.
            const hasExistingSwap = !!swapId && !!swapDetails
            const quotedFee = extendedRouteRecord?.flatFee
                ?? getExtendedMapping(source_network.name, source_token.symbol, destination_network.name, destination_token.symbol, sourceRoutes)?.flatFee
                ?? 0
            const authorizeAmount = hasExistingSwap ? subtractDecimal(amount, quotedFee, decimals) : amount

            const authorization = await authorizeWithdrawal({
                network: source_network,
                token: source_token,
                destinationNetwork: destination_network,
                destinationToken: destination_token,
                networks,
                sourceRoutes,
                sourceAddress,
                amountExact: authorizeAmount,
                amountBasis: hasExistingSwap ? 'net' : 'gross',
            }, wallet, (info) => { if (mountedRef.current) setProgress(info) })

            if (!mountedRef.current) return
            if (!authorization) throw new Error('Lighter authorization is unavailable')

            // Lighter only reveals the account-specific fee after authorization. If it
            // differs from the quote the user saw, get explicit consent before any funds move.
            const feeChanged = Number(authorization.fee) !== quotedFee
                || (hasExistingSwap && Number(authorization.debitAmount) !== A)
            if (feeChanged) {
                const confirmed = await getConfirmation({
                    content: createElement(LighterFeeUpdate, {
                        previousFee: quotedFee,
                        fee: authorization.fee,
                        netAmount: authorization.netAmount,
                        debitAmount: authorization.debitAmount,
                        hasExistingSwap,
                    }),
                    submitText: `Continue with ${authorization.fee} USDC fee`,
                    dismissText: 'Cancel',
                })
                if (!confirmed || !mountedRef.current) return
            }

            const { destination, activeSwapId } = await resolveSwapAndDepositAddress(
                amount,
                authorization.netAmount,
                authorization.fee,
            )

            // Resolves with a (possibly empty) hash on success; throws on rejection/failure.
            const txHash = await executeTransfer({
                network: source_network,
                token: source_token,
                destinationNetwork: destination_network,
                destinationToken: destination_token,
                networks,
                sourceRoutes,
                sourceAddress,
                depositAddress: destination,
                amount: A,
                amountExact: amount,
                callData: '',
                authorizationToken: authorization.authorizationToken,
                selectedWallet: wallet!,
            }, wallet, (info) => { if (mountedRef.current) setProgress(info) })

            if (!mountedRef.current) return

            // Success — hand off to the standard Processing screen by recording a pending
            // input. There is no real source tx hash (the backend detects the Arbitrum
            // bridge deposit), so the empty hash just flips the swap off the withdraw screen.
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
    }, [sourceAddress, source_network, source_token, destination_network, destination_token, destination_address, networks, sourceRoutes, depositActionsResponse, swapId, swapDetails, refuel, initialSettings, wallet, createSwap, setSwapId, executeTransfer, authorizeWithdrawal, getConfirmation, onWalletWithdrawalSuccess, swapBasicData.requested_amount, extendedRouteRecord?.flatFee])

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
