import { type SwapLifecycleEvent, type Wallet } from '@layerswap/widget-types';
import LayerSwapApiClient, {
    BackendTransactionStatus,
    DepositAction,
    SignDepositAction,
    SwapBasicData,
    SwapDetails,
} from "@/lib/apiClients/layerSwapApiClient";
import { useGaslessAuthorizationStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { isUserRejection } from "./isUserRejection";
import { TransferProps } from "@layerswap/widget-types";
import { ErrorHandler } from "@/lib/ErrorHandler";
import { lifecycleContextFromSwap, lifecycleErrorDetails } from "@/lib/swapLifecycle";
import { widgetTelemetry } from '@/lib/widgetTelemetry';

export type WalletTransfer = (props: TransferProps) => Promise<string | undefined>
export type GaslessSigner = (signAction: SignDepositAction) => Promise<string>

export type DepositExecutionContext = {
    swapData: SwapDetails
    depositActions: DepositAction[]
    swapBasicData: SwapBasicData
    selectedWallet: Wallet
    sourceAddress?: string
    layerswapApiClient: LayerSwapApiClient
    setActionStateText: (text?: string) => void
    setSwapTransaction: (id: string, status: BackendTransactionStatus, hash: string) => void
    setSwapError?: (value: string | null) => void
    onSuccess: () => void
    onLifecycle: (event: SwapLifecycleEvent) => void
}

export const isSignAction = (action: DepositAction): action is SignDepositAction => action.type === 'sign'

export const executeWalletTransfer = async (ctx: DepositExecutionContext, onClick: WalletTransfer): Promise<void> => {
    const { swapData, depositActions, swapBasicData, selectedWallet, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess, onLifecycle } = ctx

    const transferProps = resolveTransactionData(swapData, depositActions, swapBasicData, selectedWallet)
    const lifecycleContext = lifecycleContextFromSwap(swapBasicData, swapData)
    setActionStateText("Opening Wallet")
    onLifecycle({
        step: 'wallet_prompt_opened',
        stage: 'wallet_action',
        outcome: 'pending',
        path: 'WalletTransfer',
        action: 'send_transaction',
        provider: selectedWallet.providerName,
        ...lifecycleContext,
    })

    let hash: string | undefined
    const finishTelemetry = widgetTelemetry.beginOperation('wallet_transfer', {
        swap_id: swapData.id, provider: selectedWallet.providerName, timing_kind: 'user_wait_included',
    })
    try {
        hash = await onClick(transferProps)
    }
    catch (error) {
        const rejected = isUserRejection(error)
        const errorDetails = lifecycleErrorDetails(error)
        finishTelemetry(rejected ? 'rejected' : 'failed', { occurrence_id: errorDetails.occurrenceId })
        onLifecycle({
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
            stage: 'wallet_action',
            outcome: rejected ? 'rejected' : 'failed',
            path: 'WalletTransfer',
            action: 'send_transaction',
            provider: selectedWallet.providerName,
            ...errorDetails,
            reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
            ...lifecycleContext,
        })
        throw error
    }
    if (!hash) {
        finishTelemetry('failed', { reason_code: 'missing_transaction_hash' })
        const error = new Error('Wallet returned no transaction hash')
        onLifecycle({
            step: 'wallet_action_failed',
            stage: 'wallet_action',
            outcome: 'failed',
            path: 'WalletTransfer',
            action: 'send_transaction',
            provider: selectedWallet.providerName,
            reasonCode: 'missing_transaction_hash',
            reason: error.message,
            occurrenceId: lifecycleErrorDetails(error).occurrenceId,
            ...lifecycleContext,
        })
        throw error
    }

    finishTelemetry('succeeded')
    onLifecycle({
        step: 'transaction_submitted',
        stage: 'input_transfer',
        outcome: 'succeeded',
        path: 'WalletTransfer',
        action: 'send_transaction',
        provider: selectedWallet.providerName,
        transactionHash: hash,
        ...lifecycleContext,
    })

    onSuccess()
    setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, hash)
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
}

export const executeGaslessAuthorization = async (ctx: DepositExecutionContext, onSign: GaslessSigner): Promise<void> => {
    const { swapData, depositActions, swapBasicData, selectedWallet, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess, onLifecycle } = ctx

    const signAction = depositActions.find(isSignAction)
    if (!signAction) throw new Error('No sign action')
    if (!sourceAddress) throw new Error('No selected account')

    const lifecycleContext = lifecycleContextFromSwap(swapBasicData, swapData)
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
    let authorizedValidBefore: number | undefined
    const finishTelemetry = widgetTelemetry.beginOperation('gasless_authorization', {
        swap_id: swapData.id, provider: selectedWallet.providerName, timing_kind: 'user_wait_included',
    })
    try {
        authorizedValidBefore = await submitGaslessAuthorization({
            swapId: swapData.id,
            signAction,
            onSign,
            sourceAddress,
            layerswapApiClient,
        })
    } catch (e: any) {
        const rejected = isUserRejection(e)
        const errorDetails = lifecycleErrorDetails(e)
        finishTelemetry(rejected ? 'rejected' : 'failed', { occurrence_id: errorDetails.occurrenceId })
        onLifecycle({
            step: rejected ? 'wallet_action_rejected' : 'wallet_action_failed',
            stage: 'wallet_action',
            outcome: rejected ? 'rejected' : 'failed',
            path: 'GaslessAuthorization',
            action: 'sign_gasless_authorization',
            provider: selectedWallet.providerName,
            ...errorDetails,
            reasonCode: rejected ? 'user_rejected' : errorDetails.reasonCode,
            ...lifecycleContext,
        })
        // Don't flag the route unavailable when the user simply declined.
        if (!rejected) {
            const message = e?.response?.data?.error?.message || e?.message
            useGaslessPreferenceStore.getState().reportGaslessUnavailable('deposit', message)
        }
        throw e
    }

    finishTelemetry('succeeded')
    onLifecycle({
        step: 'gasless_authorization_submitted',
        stage: 'input_transfer',
        outcome: 'succeeded',
        path: 'GaslessAuthorization',
        action: 'authorize_deposit',
        provider: selectedWallet.providerName,
        ...lifecycleContext,
    })

    setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, '')
    useGaslessAuthorizationStore.getState().setGaslessAuthorization(swapData.id, authorizedValidBefore ?? fallbackGaslessValidBefore())
    onSuccess()
}

const resolveTransactionData = (swapDetails: SwapDetails, deposit_actions: DepositAction[], swapBasicData: SwapBasicData, selectedWallet: Wallet): TransferProps => {
    const depositAction = deposit_actions?.find(action => action.type === 'transfer')
    if (!depositAction) {
        throw new Error('No deposit action found')
    }
    return {
        amount: depositAction.amount,
        callData: depositAction.call_data,
        depositAddress: depositAction.to_address,
        sequenceNumber: swapDetails.metadata.sequence_number,
        swapId: swapDetails.id,
        userDestinationAddress: swapBasicData.destination_address,
        network: swapBasicData.source_network,
        token: swapBasicData.source_token,
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

const submitGaslessAuthorization = async (args: {
    swapId: string,
    signAction: SignDepositAction,
    onSign: GaslessSigner,
    sourceAddress: string,
    layerswapApiClient: LayerSwapApiClient,
}): Promise<number | undefined> => {
    const { swapId, signAction, onSign, sourceAddress, layerswapApiClient } = args

    const signAndAuthorize = async (action: SignDepositAction) => {
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
                const refreshed = await layerswapApiClient.GetDepositActionsAsync(swapId, sourceAddress)
                const freshSignAction = refreshed?.data?.find(isSignAction)
                if (!freshSignAction?.typed_data) {
                    throw new Error('Could not refresh the gasless deposit authorization. Please try again.')
                }
                await signAndAuthorize(freshSignAction)
                return resolveGaslessValidBefore(freshSignAction)
            }
        }
        throw e
    }
}
