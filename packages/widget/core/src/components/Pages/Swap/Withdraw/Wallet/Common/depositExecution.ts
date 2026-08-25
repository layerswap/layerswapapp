import { type Wallet } from '@layerswap/widget-types';
import LayerSwapApiClient, {
    BackendTransactionStatus,
    DepositAction,
    SignDepositAction,
    SwapBasicData,
    SwapDetails,
    TransferDepositAction,
} from "@/lib/apiClients/layerSwapApiClient";
import { useGaslessAuthorizationStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { isUserRejection } from "./isUserRejection";
import { TransferProps } from "@layerswap/widget-types";
import { ErrorHandler } from "@/lib/ErrorHandler";

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
}

export const isSignAction = (action: DepositAction): action is SignDepositAction => action.type === 'sign'

export const isTransferAction = (action: DepositAction): action is TransferDepositAction =>
    action.type === 'transfer' || action.type === 'manual_transfer'

export const getActionableDepositAction = (actions: DepositAction[] | undefined): SignDepositAction | TransferDepositAction | undefined => {
    if (!actions?.length) return undefined

    const current = actions.find(action =>
        action.status === 'action_required' && (isSignAction(action) || isTransferAction(action))
    )
    if (current && (isSignAction(current) || isTransferAction(current))) return current

    const legacy = actions.find(action =>
        !action.status && (isSignAction(action) || isTransferAction(action))
    )
    return legacy && (isSignAction(legacy) || isTransferAction(legacy)) ? legacy : undefined
}

export const requiresDepositActionRefresh = (action: DepositAction, actions: DepositAction[]): boolean =>
    action.step === 'approve_permit2'
    || (action.step === 'sign' && actions.some(candidate => candidate.step === 'publish'))

export const executeWalletTransfer = async (ctx: DepositExecutionContext, onClick: WalletTransfer, action: TransferDepositAction): Promise<string | undefined> => {
    const { swapData, swapBasicData, selectedWallet, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess } = ctx

    const transferProps = resolveTransactionData(swapData, action, swapBasicData, selectedWallet)
    setActionStateText("Opening Wallet")
    const hash = await onClick(transferProps)
    if (!hash) return

    // Permit2 approval is a prerequisite, not the swap transaction. The caller
    // refreshes the server-owned workflow after it confirms and presents the
    // newly actionable sign/publish step.
    if (action.step === 'approve_permit2') return hash

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

    return hash
}

export const executeGaslessAuthorization = async (ctx: DepositExecutionContext, onSign: GaslessSigner, signAction: SignDepositAction): Promise<void> => {
    const { swapData, depositActions, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess } = ctx
    const requiresUserPublish = depositActions.some(action => action.step === 'publish')

    if (!sourceAddress) throw new Error('No selected account')

    setActionStateText("Sign in wallet")
    let authorizedValidBefore: number | undefined
    try {
        authorizedValidBefore = await submitGaslessAuthorization({
            swapId: swapData.id,
            signAction,
            onSign,
            sourceAddress,
            layerswapApiClient,
        })
    } catch (e: any) {
        // Don't flag the route unavailable when the user simply declined.
        if (!requiresUserPublish && !isUserRejection(e)) {
            const message = e?.response?.data?.error?.message || e?.message
            useGaslessPreferenceStore.getState().reportGaslessUnavailable('deposit', message)
        }
        throw e
    }

    // A self-paid frontend swap still needs the user to publish the prepared
    // transaction after the signature is stored. Do not mark it submitted yet.
    if (requiresUserPublish) return

    setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, '')
    useGaslessAuthorizationStore.getState().setGaslessAuthorization(swapData.id, authorizedValidBefore ?? fallbackGaslessValidBefore())
    onSuccess()
}

const resolveTransactionData = (swapDetails: SwapDetails, depositAction: TransferDepositAction, swapBasicData: SwapBasicData, selectedWallet: Wallet): TransferProps => {
    if (!depositAction.to_address) throw new Error('Deposit action is missing a target address')
    if (depositAction.amount === undefined) throw new Error('Deposit action is missing an amount')

    return {
        amount: depositAction.amount,
        callData: depositAction.call_data || '0x',
        depositAddress: depositAction.to_address,
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
