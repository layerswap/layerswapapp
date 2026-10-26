import { type SwapLifecycleEvent, type Wallet, ActionMessageType } from '@layerswap/widget-types';
import LayerSwapApiClient, {
    DepositAction,
    SignDepositAction,
    TransferDepositAction,
    SwapBasicData,
    SwapDetails,
    GaslessAuthorizationResult,
} from "@/lib/apiClients/layerSwapApiClient";
import { useDepositSignatureStore, useGaslessAuthorizationStore, useSwapTransactionStore, type SwapExecutionKind } from "@/stores/swapTransactionStore";
import { getExplorerUrl } from '@/lib/address/explorerUrl';
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { isUserRejection } from "./isUserRejection";
import { TransferProps } from "@layerswap/widget-types";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { lifecycleContextFromSwap, lifecycleErrorDetails } from "@/lib/swapLifecycle";
import { widgetTelemetry } from '@/lib/widgetTelemetry';
import { executeWalletOperation } from './executeWalletOperation';
import { isGaslessDepositWorkflow, isGaslessAuthorizationSubmitted } from '@/helpers/gasless';
import { hasUnacknowledgedWalletAction } from '@/helpers/swapProgress';

export type WalletTransfer = (props: TransferProps) => Promise<string | undefined>
export type GaslessSigner = (signAction: SignDepositAction) => Promise<string>

export type DepositExecutionContext = {
    swapData: SwapDetails
    depositActions: DepositAction[]
    swapBasicData: SwapBasicData
    selectedWallet: Wallet
    sourceAddress?: string
    signal?: AbortSignal
    layerswapApiClient: LayerSwapApiClient
    setActionStateText: (text?: string) => void
    setSwapTransaction: (id: string, hash: string, kind?: SwapExecutionKind) => void
    cacheGaslessAuthorization: (authorization: GaslessAuthorizationResult) => void
    invalidateGaslessAuthorization: () => Promise<void>
    setSwapError?: (value: string | null) => void
    /** Latest observed status of the recorded input transaction; only a failed one may be sent again. */
    inputTransactionStatus?: { hash: string; status: string }
    onSuccess: () => void
    onLifecycle: (event: SwapLifecycleEvent) => void
}

export { isSignAction, isTransferAction, getActionableDepositAction, getDepositActionLabel, getDepositActionDescription, requiresDepositActionRefresh } from '@/helpers/depositActions';
import { getActionableDepositAction, isTransferAction, isSignAction } from '@/helpers/depositActions';

const isExpiredTransaction = (error: unknown) => (error as Error)?.name === ActionMessageType.TransactionExpired

/**
 * The deposit the store already records for this swap, read at wallet-request
 * time rather than click time. A hash can be recorded by an earlier wallet
 * request while this handler awaits preparation; the swap data it holds does
 * not change, so only the store can tell that the deposit is already on its way.
 */
const recordedDeposit = (swapId: string, transactionStatus?: { hash: string; status: string }): { hash?: string } | undefined => {
    const store = useSwapTransactionStore.getState()
    const transaction = store.swapTransactions[swapId]
    const submitted = hasUnacknowledgedWalletAction({ transaction, pendingSubmission: store.pendingSubmissions[swapId], transactionStatus })
    return submitted ? { hash: transaction?.hash } : undefined
}

export const executeWalletTransfer = async (ctx: DepositExecutionContext, onClick: WalletTransfer, action: DepositAction | undefined = getActionableDepositAction(ctx.depositActions)): Promise<string> => {
    const { swapData, swapBasicData, selectedWallet, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess, onLifecycle, signal } = ctx

    if (!action || !isTransferAction(action)) throw new Error('No transfer action')
    if (action.step === 'approve' || ctx.depositActions.some(item => item.step === 'approve')) throw new Error('Atomic approvals must be submitted together with the swap')
    const transferProps = resolveTransactionData(swapData, action, swapBasicData, selectedWallet)
    const lifecycleContext = lifecycleContextFromSwap(swapBasicData, swapData)
    const confirmationText = action.step === 'approve_permit2' ? "Approve in your wallet" : "Confirm in your wallet"
    setActionStateText(confirmationText)

    let hash: string
    const finishTelemetry = widgetTelemetry.beginOperation('wallet_transfer', {
        swap_id: swapData.id, provider: selectedWallet.providerName, timing_kind: 'user_wait_included',
    })
    // Approvals are prerequisites with their own receipts; only the deposit itself must never be requested twice.
    const alreadySubmitted = () => action.step === 'approve_permit2' ? undefined : recordedDeposit(swapData.id, ctx.inputTransactionStatus)
    const requestWallet = (props: TransferProps, { retriesExpiry }: { retriesExpiry: boolean }) => {
        if (signal?.aborted) {
            finishTelemetry('cancelled')
            signal.throwIfAborted()
        }
        // The provider's own preparation (a Monad transaction builder reads gas and
        // fees first) runs inside the wallet request. The provider, or the transfer
        // resolver for one without preparation, signals when the wallet is actually
        // asked: the prompt event is reported there and the preparation is timed apart.
        const requested = Date.now()
        let adapterPreparationMs: number | undefined
        return executeWalletOperation({
            context: {
                ...lifecycleContext,
                path: 'WalletTransfer',
                action: action.step === 'approve_permit2' ? 'approve_permit2' : 'send_transaction',
                provider: selectedWallet.providerName,
            },
            onLifecycle,
            // Keep one timing operation across the Stellar refresh and both wallet requests.
            onSettled: (outcome, attributes) => finishTelemetry(outcome,
                adapterPreparationMs === undefined ? attributes : { ...attributes, adapter_preparation_ms: adapterPreparationMs }),
            reportsSubmission: action.step !== 'approve_permit2',
            shouldReportError: error => !(retriesExpiry && isExpiredTransaction(error)),
            promptOpensOn: 'wallet_request',
        }, reportPrompt => onClick({
            ...props,
            onWalletRequest: () => {
                adapterPreparationMs ??= Date.now() - requested
                reportPrompt()
            },
        }))
    }

    // The recorded deposit already had its receipt, success hand-off and catch-up; this handler only stops.
    const submitted = alreadySubmitted()
    if (submitted) {
        finishTelemetry('cancelled', { reason_code: 'deposit_already_submitted' })
        return submitted.hash ?? ''
    }
    try {
        hash = await requestWallet(transferProps, { retriesExpiry: true })
    } catch (error) {
        if (!isExpiredTransaction(error)) throw error
        if (signal?.aborted) {
            finishTelemetry('cancelled')
            signal.throwIfAborted()
        }

        setActionStateText("Refreshing transfer")
        // An API step between two wallet requests: its failure ends the operation but is
        // neither a wallet prompt nor a wallet action failure (onError reports the API error).
        let refreshedProps: TransferProps
        try {
            const refreshed = await layerswapApiClient.GetDepositActionsAsync(
                swapData.id,
                sourceAddress ?? selectedWallet.address,
            )
            const refreshedAction = getActionableDepositAction(refreshed?.data)
            if (!refreshedAction || !isTransferAction(refreshedAction) || refreshedAction.step !== action.step) {
                throw new Error('Could not refresh the expired Stellar deposit action. Please try again.')
            }
            refreshedProps = resolveTransactionData(swapData, refreshedAction, swapBasicData, selectedWallet)
        } catch (refreshError) {
            finishTelemetry('failed', {
                reason_code: 'deposit_action_refresh_failed',
                occurrence_id: lifecycleErrorDetails(refreshError).occurrenceId,
            })
            throw refreshError
        }
        const submittedDuringRefresh = alreadySubmitted()
        if (submittedDuringRefresh) {
            finishTelemetry('cancelled', { reason_code: 'deposit_already_submitted' })
            return submittedDuringRefresh.hash ?? ''
        }
        setActionStateText(confirmationText)
        hash = await requestWallet(refreshedProps, { retriesExpiry: false })
    }

    // Save the approval receipt even if the screen closed during the wallet request.
    // It must not replace the execution transaction or mark the swap as submitted.
    if (action.step === 'approve_permit2') {
        await useSwapTransactionStore.getState().setStepTransaction(
            swapData.id,
            action.step,
            hash,
            getExplorerUrl(transferProps.network.transaction_explorer_template, hash),
        )
        return hash
    }

    await setSwapTransaction(swapData.id, hash, action.step === 'publish' ? 'frontend-swap' : 'wallet-transfer')
    onSuccess()
    useDepositSignatureStore.getState().removeDepositSignature(swapData.id)
    try {
        await layerswapApiClient.SwapCatchup(swapData.id, hash)
    } catch (e) {
        ErrorHandler({
            type: 'SwapCatchupError',
            message: (e as Error)?.message || 'Swap catchup failed',
            name: (e as Error)?.name,
            stack: (e as Error)?.stack,
            cause: e,
            swapId: swapData.id,
            transactionHash: hash,
            fromAddress: sourceAddress,
            toAddress: swapBasicData?.destination_address,
        })
    }
    return hash
}

export const executeGaslessAuthorization = async (ctx: DepositExecutionContext, onSign: GaslessSigner, signAction: DepositAction | undefined = getActionableDepositAction(ctx.depositActions)): Promise<number | undefined> => {
    const { swapData, depositActions, swapBasicData, selectedWallet, sourceAddress, layerswapApiClient, setActionStateText, onLifecycle, signal } = ctx

    if (!signAction || !isSignAction(signAction)) throw new Error('No sign action')
    if (!sourceAddress) throw new Error('No selected account')

    const lifecycleContext = lifecycleContextFromSwap(swapBasicData, swapData)
    // Once per wallet request, so the re-sign after an expired authorization is a prompt too.
    const onWalletPrompt = () => {
        signal?.throwIfAborted()
        setActionStateText("Sign in wallet")
        onLifecycle({
            step: 'wallet_prompt_opened',
            stage: 'wallet_action',
            outcome: 'pending',
            path: 'GaslessAuthorization',
            action: 'sign_gasless_authorization',
            provider: selectedWallet.providerName,
            ...lifecycleContext,
        })
    }
    let authorizedValidBefore: number | undefined
    const finishTelemetry = widgetTelemetry.beginOperation('gasless_authorization', {
        swap_id: swapData.id, provider: selectedWallet.providerName, timing_kind: 'user_wait_included',
    })
    try {
        authorizedValidBefore = await submitGaslessAuthorization({
            swapId: swapData.id,
            signAction,
            onSign,
            onWalletPrompt,
            sourceAddress,
            layerswapApiClient,
        })
    } catch (e: any) {
        if (signal?.aborted) {
            finishTelemetry('cancelled')
            throw e
        }
        const rejected = isUserRejection(e)
        const errorDetails = lifecycleErrorDetails(e)
        // Layerswap's API refused the authorization or its refresh failed: not a wallet failure.
        const apiFailure = !rejected && (e?.[AUTHORIZE_API_ERROR] || e?.[AUTHORIZATION_REFRESH_ERROR])
        const refreshFailed = !rejected && !!e?.[AUTHORIZATION_REFRESH_ERROR]
        const reasonCode = rejected ? 'user_rejected' : refreshFailed ? 'deposit_action_refresh_failed' : errorDetails.reasonCode
        finishTelemetry(rejected ? 'rejected' : 'failed', {
            occurrence_id: errorDetails.occurrenceId,
            ...(refreshFailed ? { reason_code: reasonCode } : {}),
        })
        onLifecycle(apiFailure ? {
            step: 'gasless_authorization_failed',
            stage: 'input_transfer',
            outcome: 'failed',
            path: 'GaslessAuthorization',
            action: 'authorize_deposit',
            provider: selectedWallet.providerName,
            ...errorDetails,
            reasonCode,
            ...lifecycleContext,
        } : {
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
            stage: 'wallet_action',
            outcome: rejected ? 'rejected' : 'failed',
            path: 'GaslessAuthorization',
            action: 'sign_gasless_authorization',
            provider: selectedWallet.providerName,
            ...errorDetails,
            reasonCode,
            ...lifecycleContext,
        })
        // Don't flag the route unavailable when the user simply declined.
        if (isGaslessDepositWorkflow(depositActions) === true && !rejected) {
            const message = e?.response?.data?.error?.message || e?.message
            useGaslessPreferenceStore.getState().reportGaslessUnavailable('deposit', message)
        }
        throw e
    }

    finishTelemetry('succeeded')
    // A renewed signature has a new backend authorization. Clear the prior
    // response before execution can observe a cached terminal result for this swap.
    await ctx.invalidateGaslessAuthorization()
    // Retain accepted signatures after closing, but only confirmed gasless workflows
    // may activate authorization polling. Sign-only payloads can reveal publish later.
    const validBefore = authorizedValidBefore ?? fallbackGaslessValidBefore()
    if (isGaslessDepositWorkflow(depositActions) === true) {
        useGaslessAuthorizationStore.getState().setGaslessAuthorization(swapData.id, validBefore)
        useDepositSignatureStore.getState().removeDepositSignature(swapData.id)
    } else {
        useDepositSignatureStore.getState().setDepositSignature(swapData.id, validBefore)
    }
    return authorizedValidBefore
}

export const completeGaslessSubmission = (ctx: DepositExecutionContext, authorization: GaslessAuthorizationResult, validBefore?: number): void => {
    if (!isGaslessAuthorizationSubmitted(authorization)) throw new Error('The gasless deposit has not been submitted')
    const { swapData, swapBasicData, selectedWallet, setSwapTransaction, onSuccess, onLifecycle } = ctx

    onLifecycle({
        step: 'gasless_authorization_submitted',
        stage: 'input_transfer',
        outcome: 'succeeded',
        path: 'GaslessAuthorization',
        action: 'authorize_deposit',
        provider: selectedWallet.providerName,
        ...lifecycleContextFromSwap(swapBasicData, swapData),
    })

    const store = useGaslessAuthorizationStore.getState()
    if (!store.authorizations[swapData.id]) {
        store.setGaslessAuthorization(swapData.id, validBefore ?? fallbackGaslessValidBefore())
    }
    ctx.cacheGaslessAuthorization(authorization)
    useDepositSignatureStore.getState().removeDepositSignature(swapData.id)
    const hash = authorization.transaction?.transaction_hash
    if (hash) setSwapTransaction(swapData.id, hash, 'gasless-deposit')
    onSuccess()
}

const resolveTransactionData = (swapDetails: SwapDetails, depositAction: TransferDepositAction, swapBasicData: SwapBasicData, selectedWallet: Wallet): TransferProps => {
    if (!depositAction.to_address) throw new Error('Deposit action is missing a target address')
    if (depositAction.amount === undefined) throw new Error('Deposit action is missing an amount')

    return {
        amount: depositAction.amount,
        amountInBaseUnits: depositAction.amount_in_base_units,
        callData: depositAction.call_data ?? '',
        encodedArgs: depositAction.encoded_args,
        depositAddress: depositAction.to_address,
        sourceAddress: depositAction.from_address,
        sequenceNumber: swapDetails.metadata.sequence_number,
        swapId: swapDetails.id,
        userDestinationAddress: swapBasicData.destination_address,
        network: depositAction.network ?? swapBasicData.source_network,
        token: depositAction.token ?? swapBasicData.source_token,
        selectedWallet,
    }
}

const resolveGaslessValidBefore = (action: SignDepositAction): number | undefined => {
    if (typeof action.valid_before === 'number') return action.valid_before
    const fromTypedData = action.typed_data?.message?.validBefore
    const parsed = fromTypedData != null ? Number(fromTypedData) : NaN
    return Number.isFinite(parsed) ? parsed : undefined
}

const GASLESS_FALLBACK_WINDOW_SECONDS = 30 * 60
const fallbackGaslessValidBefore = (): number => Math.floor(Date.now() / 1000) + GASLESS_FALLBACK_WINDOW_SECONDS

const AUTHORIZE_API_ERROR = Symbol('authorizeApiError')
const AUTHORIZATION_REFRESH_ERROR = Symbol('authorizationRefreshError')

const submitGaslessAuthorization = async (args: {
    swapId: string,
    signAction: SignDepositAction,
    onSign: GaslessSigner,
    onWalletPrompt: () => void,
    sourceAddress: string,
    layerswapApiClient: LayerSwapApiClient,
}): Promise<number | undefined> => {
    const { swapId, signAction, onSign, onWalletPrompt, sourceAddress, layerswapApiClient } = args

    const signAndAuthorize = async (action: SignDepositAction) => {
        onWalletPrompt()
        const signature = await onSign(action)
        try {
            await layerswapApiClient.AuthorizeSwapAsync(swapId, signature, sourceAddress)
        } catch (e: any) {
            if (e && typeof e === 'object') e[AUTHORIZE_API_ERROR] = true
            throw e
        }
    }

    try {
        await signAndAuthorize(signAction)
        return resolveGaslessValidBefore(signAction)
    } catch (e: any) {
        if (e?.[AUTHORIZE_API_ERROR]) {
            const message: string = (e?.response?.data?.error?.message || e?.message || '').toLowerCase()
            if (message.includes('already') && message.includes('authoriz')) {
                return resolveGaslessValidBefore(signAction)
            }
            if (message.includes('expired')) {
                let freshSignAction: SignDepositAction | undefined
                try {
                    const refreshed = await layerswapApiClient.GetDepositActionsAsync(swapId, sourceAddress)
                    freshSignAction = refreshed?.data?.find(isSignAction)
                    if (!freshSignAction?.typed_data) {
                        throw new Error('Could not refresh the gasless deposit authorization. Please try again.')
                    }
                } catch (refreshError: any) {
                    if (refreshError && typeof refreshError === 'object') refreshError[AUTHORIZATION_REFRESH_ERROR] = true
                    throw refreshError
                }
                await signAndAuthorize(freshSignAction)
                return resolveGaslessValidBefore(freshSignAction)
            }
        }
        throw e
    }
}
