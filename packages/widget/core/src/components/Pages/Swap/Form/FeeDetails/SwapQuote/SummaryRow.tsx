import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon';
import { useDepositSettings } from '@/context/depositSettings';
import { useInitialSettings } from '@/context/settings';
import { Address } from '@/lib/address/Address';
import { Quote } from '@/lib/apiClients/layerSwapApiClient';
import { Partner } from '@/Models/Partner';
import { useAddressName } from '@/stores/addressBookStore';
import { type Wallet } from '@layerswap/widget-types';
import { FC } from 'react';
import { DetailsButton, SwapValues } from '..';
import { QuoteSummaryView } from '../../../Withdraw/Presentation/QuoteSummaryView';
import { Slippage } from '../Slippage';
import { GasFee } from './DetailedEstimates';

export const SummaryRow: FC<{
    isQuoteLoading?: boolean;
    values: SwapValues;
    wallet?: Wallet;
    onOpen?: () => void;
    isOpen?: boolean;
    sourceAddress?: string;
    quoteData: Quote;
    partner?: Partner;
    compact?: boolean;
}> = ({
    quoteData,
    isQuoteLoading,
    values,
    wallet,
    onOpen,
    sourceAddress,
    isOpen,
    partner,
    compact,
}) => {
    const { destination_address: destinationAddressFromQuery } =
        useInitialSettings();
    const { showDestinationAddress } = useDepositSettings();
    const { to, destination_address } = values;
    const savedName = useAddressName(destination_address, to);
    const addressProviderIcon =
        destinationAddressFromQuery &&
        partner?.is_wallet &&
        Address.equals(
            destinationAddressFromQuery,
            values?.destination_address!,
            values?.to!,
        ) &&
        partner?.logo;

    return (
        <QuoteSummaryView
            compact={compact}
            quoteData={quoteData}
            values={values}
            isOpen={isOpen}
            onOpen={onOpen}
            sourceAddress={sourceAddress}
            showDestinationAddress={showDestinationAddress}
            recipient={{
                wallet,
                partnerIcon: addressProviderIcon || undefined,
                savedName,
            }}
            destinationContent={
                Address.isValid(
                    values?.destination_address || '',
                    values?.to,
                ) && values?.to ? (
                    <ExtendedAddress
                        address={values?.destination_address || ''}
                        network={values?.to}
                        showDetails={wallet ? true : false}
                        title={wallet?.displayName?.split('-')[0]}
                        description={wallet?.providerName}
                        logo={wallet?.icon}
                        shouldShowChevron={false}
                    />
                ) : undefined
            }
            slippage={<Slippage quoteData={quoteData.quote} values={values} />}
            gasFee={<GasFee values={values} quote={quoteData.quote} />}
            detailsButton={
                <DetailsButton
                    quote={quoteData.quote}
                    isQuoteLoading={isQuoteLoading}
                    swapValues={values}
                    destination={to}
                    destinationAddress={destination_address}
                    reward={quoteData.reward}
                />
            }
        />
    );
};
