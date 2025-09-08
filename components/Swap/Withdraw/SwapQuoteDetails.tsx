import { FC } from 'react'
import QuoteDetails, { SwapValues } from '@/components/FeeDetails';
import { Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';

type Props = {
    swapBasicData: SwapBasicData | undefined,
    quote: SwapQuote | undefined,
    refuel: Refuel | undefined,
    quoteIsLoading: boolean
}

export const SwapQuoteDetails: FC<Props> = ({ swapBasicData: swapData, quote, refuel, quoteIsLoading }) => {
    const { source_network, destination_network, use_deposit_address, destination_token, requested_amount, source_token, destination_address } = swapData || {}

    if (!requested_amount || !source_network || !destination_network || !quote) return <div className='h-[56px] w-full rounded-xl bg-secondary-500 animate-pulse'/>

    const values: SwapValues = {
        amount: requested_amount.toString(),
        from: source_network,
        to: destination_network,
        fromAsset: source_token,
        toAsset: destination_token,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    }

    return <QuoteDetails quote={{ quote, refuel }} swapValues={values} isQuoteLoading={quoteIsLoading} />

}