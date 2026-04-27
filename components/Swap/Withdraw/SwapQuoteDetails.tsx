import { FC } from 'react'
import { SwapValues } from '@/components/FeeDetails';
import { NetworkRoute, NetworkRouteToken } from '@/Models/Network';
import { Refuel, SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import SwapQuoteComp from '@/components/FeeDetails/SwapQuote';
import { QuoteError } from '@/hooks/useFee';
import { ErrorDisplay } from '@/components/validationError/ErrorDisplay';
import { Partner } from '@/Models/Partner';
import { RouteOff } from 'lucide-react';
import { ICON_CLASSES_WARNING } from '@/components/validationError/constants';

type Props = {
    swapBasicData: SwapBasicData | undefined,
    quote: SwapQuote | undefined,
    quoteError: QuoteError | undefined,
    refuel: Refuel | undefined,
    quoteIsLoading: boolean,
    partner?: Partner | undefined
}

export const SwapQuoteDetails: FC<Props> = ({ swapBasicData: swapData, quote, refuel, quoteIsLoading, quoteError, partner }) => {
    const { source_network, destination_network, use_deposit_address, destination_token, requested_amount, source_token, destination_address } = swapData || {}

    if (quoteError) return (
        <ErrorDisplay
            icon={<RouteOff className={ICON_CLASSES_WARNING} />}
            title="Unable to retrieve quote"
            message="Unable to retrieve quote"
        />
    )

    if (!quote) return <div className='h-[150px] w-full rounded-xl bg-secondary-500 animate-pulse' />

    const values: SwapValues = {
        amount: requested_amount?.toString(),
        source: (source_network && source_token) ? { network: source_network as NetworkRoute, token: source_token as NetworkRouteToken } : undefined,
        destination: (destination_network && destination_token) ? { network: destination_network as NetworkRoute, token: destination_token as NetworkRouteToken } : undefined,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    }

    return <SwapQuoteComp quote={{ quote, refuel }} swapValues={values} isQuoteLoading={quoteIsLoading} partner={partner} />
}
