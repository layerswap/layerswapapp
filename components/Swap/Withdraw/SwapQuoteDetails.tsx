import { FC } from 'react'
import QuoteDetails, { SwapValues } from '@/components/FeeDetails';
import { Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';

type Props = {
    swapBasicData: SwapBasicData | undefined,
    quote: SwapQuote | undefined,
    refuel: Refuel | undefined,
}

export const SwapQuoteDetails: FC<Props> = ({ swapBasicData: swapData, quote, refuel }) => {
    const { source_network, destination_network, use_deposit_address, destination_token, requested_amount, source_token, destination_address } = swapData || {}

    if (!requested_amount || !source_network || !destination_network || !quote) return null
    
    const values: SwapValues = {
        amount: requested_amount.toString(),
        from: source_network,
        to: destination_network,
        fromAsset: source_token,
        toAsset: destination_token,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    }

    return <QuoteDetails quote={{ quote, refuel }} swapValues={values} />

}