import { type Refuel } from '@layerswap/widget-types';
import { FC } from 'react';
import { SwapBasicData, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import { SwapValues } from '../Form/FeeDetails';
import SwapQuoteComp from '../Form/FeeDetails/SwapQuote';
import { QuoteError } from '@/hooks/useFee';
import { Partner } from '@/Models';
import { QuoteAvailabilityView } from './Presentation/QuoteAvailabilityView';

type Props = {
    swapBasicData: SwapBasicData | undefined;
    quote: SwapQuote | undefined;
    quoteError: QuoteError | undefined;
    refuel: Refuel | undefined;
    quoteIsLoading: boolean;
    partner?: Partner | undefined;
    compact?: boolean;
};

export const SwapQuoteDetails: FC<Props> = ({
    swapBasicData: swapData,
    quote,
    refuel,
    quoteIsLoading,
    quoteError,
    partner,
    compact,
}) => {
    const {
        source_network,
        destination_network,
        use_deposit_address,
        destination_token,
        requested_amount,
        source_token,
        destination_address,
    } = swapData || {};

    const values: SwapValues = {
        amount: requested_amount?.toString(),
        from: source_network,
        to: destination_network,
        fromAsset: source_token,
        toAsset: destination_token,
        depositMethod: use_deposit_address ? 'deposit_address' : 'wallet',
        destination_address,
    };

    return (
        <QuoteAvailabilityView error={!!quoteError} available={!!quote}>
            {quote && (
                <SwapQuoteComp
                    quote={{ quote, refuel }}
                    swapValues={values}
                    isQuoteLoading={quoteIsLoading}
                    partner={partner}
                    compact={compact}
                />
            )}
        </QuoteAvailabilityView>
    );
};
