import { SwapFormValues } from '@/components/Pages/Swap/Form/SwapFormValues';
import { useSelectedAccount } from '@/context/swapAccounts';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import { Partner } from '@/Models/Partner';
import { Network } from '@layerswap/widget-types';
import { FC, useState } from 'react';
import { QuoteView } from '../../../Withdraw/Presentation/QuoteView';
import { DetailedEstimates } from './DetailedEstimates';
import { SummaryRow } from './SummaryRow';

interface SwapValues extends Omit<SwapFormValues, 'from' | 'to'> {
    from?: Network;
    to?: Network;
}

interface QuoteComponentProps {
    quote: Quote;
    isQuoteLoading?: boolean;
    swapValues: SwapValues;
    destination?: Network;
    destinationAddress?: string;
    sourceAddress?: string;
    onOpen?: () => void;
    isAccordionOpen?: boolean;
    partner?: Partner;
    compact?: boolean;
}

const SwapQuoteComp: FC<QuoteComponentProps> = ({
    swapValues: values,
    quote: quoteData,
    isQuoteLoading,
    partner,
    compact,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const { wallets: destWallets } = useWallet(values.to, 'autofill');
    const wallet =
        values?.to && values?.destination_address
            ? destWallets?.find((w) =>
                  w.addresses?.some((a) =>
                      Address.equals(
                          a,
                          values.destination_address!,
                          values.to!,
                      ),
                  ),
              )
            : undefined;
    const selectedSourceAccount = useSelectedAccount(
        'from',
        values?.from?.name,
    );

    return (
        <QuoteView
            compact={compact}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            summary={
                <SummaryRow
                    compact={compact}
                    isQuoteLoading={isQuoteLoading}
                    values={values}
                    wallet={wallet}
                    quoteData={quoteData}
                    onOpen={() => setIsOpen(true)}
                    isOpen={isOpen}
                    sourceAddress={selectedSourceAccount?.address}
                    partner={partner}
                />
            }
            details={
                <DetailedEstimates
                    swapValues={values}
                    quote={quoteData?.quote}
                    reward={quoteData?.reward}
                    variant="base"
                />
            }
        />
    );
};
export default SwapQuoteComp;
