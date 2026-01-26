import useSWR from 'swr'
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { buildQuoteUrl } from './useFee'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'

type AutoSlippageTestProps = {
    values: SwapFormValues
    shouldTest: boolean
}

export function useAutoSlippageTest({ values, shouldTest }: AutoSlippageTestProps) {
    const apiClient = new LayerSwapApiClient()

    const autoSlippageTestURL = shouldTest
        ? buildQuoteUrl({
            sourceNetwork: values.from?.name ?? '',
            sourceToken: values.fromAsset?.symbol ?? '',
            destinationNetwork: values.to?.name ?? '',
            destinationToken: values.toAsset?.symbol ?? '',
            amount: values.amount ?? '',
            refuel: !!values.refuel,
            useDepositAddress: values.depositMethod !== 'wallet',
        })
        : null

    const { data, isLoading } = useSWR<ApiResponse<Quote>>(autoSlippageTestURL, apiClient.fetcher, { dedupingInterval: 5000, revalidateOnFocus: false, })

    return {
        autoSlippageWouldWork: !!data?.data,
        isTestingAutoSlippage: isLoading
    }
}
