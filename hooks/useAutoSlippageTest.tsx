import useSWR from 'swr'
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { buildQuoteUrl } from './useFee'
import { SwapFormValues } from '@/components/DTOs/SwapFormValues'

type AutoSlippageTestProps = {
    values: SwapFormValues
    shouldTest: boolean
}
const apiClient = new LayerSwapApiClient()

export function useAutoSlippageTest({ values, shouldTest }: AutoSlippageTestProps) {

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

    const { data, isLoading, error } = useSWR<ApiResponse<Quote>>(
        autoSlippageTestURL,
        apiClient.fetcher,
        {
            dedupingInterval: 10000,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
            errorRetryCount: 0,
            onError: (err) => {
                console.debug('Auto slippage test failed:', err);
            }
        }
    )

    return {
        autoSlippageWouldWork: !error && !!data?.data,
        isTestingAutoSlippage: isLoading,
    }
}
