import { FC } from 'react'
import { SwapValues } from '@/components/FeeDetails';
import { Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import SwapQuoteComp from '@/components/FeeDetails/SwapQuote';
import { QuoteError } from '@/hooks/useFee';
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay';

type Props = {
    swapBasicData: SwapBasicData | undefined,
    quote: SwapQuote | undefined,
    quoteError: QuoteError | undefined,
    refuel: Refuel | undefined,
    quoteIsLoading: boolean
}

export const SwapQuoteDetails: FC<Props> = ({ swapBasicData: swapData, quote, refuel, quoteIsLoading, quoteError }) => {
    const { source_network, destination_network, use_deposit_address, destination_token, requested_amount, source_token, destination_address } = swapData || {}

    if (quoteError) return <ErrorDisplay errorName='quoteError' />

    if (!quote) return <div className='h-[105px] w-full rounded-xl bg-secondary-500 animate-pulse' />

    const values: SwapValues = {
        amount: requested_amount?.toString(),
        from: source_network,
        to: destination_network,
        fromAsset: source_token,
        toAsset: destination_token,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    }

    return <SwapQuoteComp quote={{ quote, refuel }} swapValues={values} isQuoteLoading={quoteIsLoading} />

}