import useSWR from 'swr'
import LayerSwapApiClient, { Quote } from '../lib/apiClients/layerSwapApiClient'
import { ApiResponse } from '../Models/ApiResponse'
import { buildQuoteUrl, QuoteUrlArgs } from './useFee'

type AutoSlippageTestProps = Omit<QuoteUrlArgs, 'slippage'> & {
    shouldTest: boolean
}

export function useAutoSlippageTest(props: AutoSlippageTestProps) {
    const { shouldTest, ...quoteArgs } = props
    const apiClient = new LayerSwapApiClient()

    const autoSlippageTestURL = shouldTest ? buildQuoteUrl(quoteArgs) : null

    const { data } = useSWR<ApiResponse<Quote>>(autoSlippageTestURL, apiClient.fetcher, { dedupingInterval: 5000, revalidateOnFocus: false, })

    return {
        autoSlippageWouldWork: !!data?.data
    }
}
