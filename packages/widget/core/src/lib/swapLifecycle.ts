import type { SwapLifecycleEvent } from '@layerswap/widget-types'
import type { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues'
import type { SwapBasicData, SwapDetails } from '@/lib/apiClients/layerSwapApiClient'

export type SwapLifecycleContext = Partial<Pick<
    SwapLifecycleEvent,
    | 'swapId'
    | 'depositMethod'
    | 'requestedAmount'
    | 'fromAddress'
    | 'toAddress'
    | 'sourceNetwork'
    | 'destinationNetwork'
    | 'sourceToken'
    | 'destinationToken'
>>

export function lifecycleContextFromForm(values: SwapFormValues): SwapLifecycleContext {
    return {
        depositMethod: values.depositMethod,
        requestedAmount: values.amount,
        toAddress: values.destination_address,
        sourceNetwork: values.from?.name,
        destinationNetwork: values.to?.name,
        sourceToken: values.fromAsset?.symbol,
        destinationToken: values.toAsset?.symbol,
    }
}

export function lifecycleContextFromSwap(
    swap: SwapBasicData,
    details?: SwapDetails,
): SwapLifecycleContext {
    return {
        swapId: details?.id,
        depositMethod: swap.use_deposit_address ? 'deposit_address' : 'wallet',
        requestedAmount: swap.requested_amount?.toString(),
        fromAddress: details?.source_address,
        toAddress: swap.destination_address,
        sourceNetwork: swap.source_network?.name,
        destinationNetwork: swap.destination_network?.name,
        sourceToken: swap.source_token?.symbol,
        destinationToken: swap.destination_token?.symbol,
    }
}

export function lifecycleErrorDetails(error: unknown): Pick<SwapLifecycleEvent, 'reasonCode' | 'reason'> {
    const candidate = error as {
        name?: string
        code?: string | number
        message?: string
        shortMessage?: string
        response?: { data?: { error?: { code?: string; message?: string } } }
    }
    const apiError = candidate?.response?.data?.error

    return {
        reasonCode: apiError?.code || candidate?.code?.toString() || candidate?.name || 'unknown_error',
        reason: apiError?.message || candidate?.shortMessage || candidate?.message || String(error),
    }
}
