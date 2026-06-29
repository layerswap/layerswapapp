import posthog from "posthog-js";
import LayerSwapApiClient, {
    BackendTransactionStatus,
    DepositAction,
    SignDepositAction,
    SwapBasicData,
    SwapDetails,
} from "@/lib/apiClients/layerSwapApiClient";
import { useGaslessAuthorizationStore } from "@/stores/swapTransactionStore";
import { useGaslessPreferenceStore } from "@/stores/gaslessPreferenceStore";
import { Network } from "@/Models/Network";
import { TransferProps } from "./sharedTypes";
import { isUserRejection } from "./isUserRejection";

export type WalletTransfer = (props: TransferProps) => Promise<string | undefined>
export type GaslessSigner = (signAction: SignDepositAction) => Promise<string>

export type DepositExecutionContext = {
    swapData: SwapDetails
    depositActions: DepositAction[]
    swapBasicData: SwapBasicData
    sourceAddress?: string
    layerswapApiClient: LayerSwapApiClient
    setActionStateText: (text?: string) => void
    setSwapTransaction: (id: string, status: BackendTransactionStatus, hash: string) => void
    setSwapError?: (value: string | null) => void
    onSuccess: () => void
}

export const isSignAction = (action: DepositAction): action is SignDepositAction => action.type === 'sign'

export const executeWalletTransfer = async (ctx: DepositExecutionContext, onClick: WalletTransfer): Promise<void> => {
    const { swapData, depositActions, swapBasicData, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess } = ctx

    const transferProps = resolveTransactionData(swapData, depositActions, swapBasicData.destination_address, swapBasicData.source_network)
    setActionStateText("Opening Wallet")
    const hash = await onClick(transferProps)
    if (!hash) return

    onSuccess()
    setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, hash)
    try {
        await layerswapApiClient.SwapCatchup(swapData.id, hash)
    } catch (e) {
        posthog.captureException(e, {
            $layerswap_exception_type: "Swap Catchup Error",
            swapId: swapData.id,
            transactionHash: hash,
            $fromAddress: sourceAddress,
            $toAddress: swapBasicData?.destination_address,
        })
    }
}

export const executeGaslessAuthorization = async (ctx: DepositExecutionContext, onSign: GaslessSigner): Promise<void> => {
    const { swapData, depositActions, sourceAddress, layerswapApiClient, setActionStateText, setSwapTransaction, onSuccess } = ctx

    const signAction = depositActions.find(isSignAction)
    if (!signAction) throw new Error('No sign action')
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
        // The user declining the signature is not a failure of the gasless route; only flag
        // genuine errors so we can offer the standard-transfer fallback instead of a raw error.
        if (!isUserRejection(e)) {
            useGaslessPreferenceStore.getState().reportGaslessUnavailable()
        }
        throw e
    }

    setSwapTransaction(swapData.id, BackendTransactionStatus.Pending, '')
    useGaslessAuthorizationStore.getState().setGaslessAuthorization(swapData.id, authorizedValidBefore ?? fallbackGaslessValidBefore())
    onSuccess()
}

const resolveTransactionData = (swapDetails: SwapDetails, deposit_actions: DepositAction[], destination_address: string, source_network: Network): TransferProps => {
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
        userDestinationAddress: destination_address
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
            await layerswapApiClient.AuthorizeSwapAsync(swapId, signature)
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
