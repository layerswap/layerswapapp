import { FC } from 'react'
import QuoteDetails, { SwapValues } from '@/components/FeeDetails';
import { SwapResponse } from '@/lib/apiClients/layerSwapApiClient';

export const SwapQuoteDetails: FC<{ swapResponse: SwapResponse | undefined }> = ({ swapResponse }) => {
    const { swap, quote, refuel } = swapResponse || {}
    const { source_exchange, source_network, destination_network, destination_exchange, destination_token, requested_amount, source_token, destination_address } = swap || {}

    if (!requested_amount || !source_network || !destination_network || !quote) return null

    const values: SwapValues = {
        fromExchange: source_exchange,
        amount: requested_amount.toString(),
        from: source_network,
        to: destination_network,
        fromAsset: source_token,
        toAsset: destination_token,
        depositMethod: swap?.use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    }

    return <QuoteDetails quote={{ quote, refuel }} swapValues={values} />

}