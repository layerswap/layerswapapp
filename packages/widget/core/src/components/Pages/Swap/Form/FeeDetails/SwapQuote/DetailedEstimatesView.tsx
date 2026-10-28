import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { Network, NetworkRouteToken } from '@layerswap/widget-types';
import type {
    SwapQuote,
    QuoteReward,
} from '@/lib/apiClients/layerSwapApiClient';
import { Address } from '@/lib/address/Address';
import shortenString from '@/components/utils/ShortenString';
import { AddressDetailsView } from '@/components/Common/AddressDetailsView';
import type { SwapValues } from '..';
import {
    Fees,
    Rate,
    Estimates,
    Reward,
    RowWrapper,
} from '../../../Withdraw/Presentation/QuoteEstimateRows';
export function DetailedEstimatesView({
    quote,
    reward,
    values,
    variant,
    showReward,
    gasFee,
    slippage,
    tokenAddress,
}: {
    quote?: SwapQuote;
    reward?: QuoteReward;
    values: SwapValues;
    variant?: 'base' | 'extended';
    showReward?: boolean;
    gasFee?: ReactNode;
    slippage?: ReactNode;
    tokenAddress?: ReactNode;
}) {
    return (
        <div className="flex flex-col w-full px-2">
            {variant === 'extended' && gasFee}
            <Fees quote={quote} values={values} />
            {values.depositMethod !== 'deposit_address' && (
                <Rate
                    fromAsset={values?.fromAsset}
                    toAsset={values?.toAsset}
                    rate={quote?.rate}
                />
            )}
            {values.depositMethod === 'deposit_address' &&
                variant === 'extended' &&
                values?.fromAsset?.contract && (
                    <ExchangeTokenContractView
                        fromAsset={values?.fromAsset}
                        network={values?.from}
                        addressContent={tokenAddress}
                    />
                )}
            {variant === 'extended' &&
                values.depositMethod === 'wallet' &&
                slippage}
            <Estimates quote={quote} />
            {showReward && reward && <Reward reward={reward} />}
        </div>
    );
}

export const ExchangeTokenContractView = ({
    fromAsset,
    network,
    addressContent,
}: {
    fromAsset: NetworkRouteToken | undefined;
    network: Network | undefined;
    addressContent?: ReactNode;
}) => {
    const isValidAddress = useMemo(() => {
        return (
            fromAsset?.contract &&
            network &&
            Address.isValid(fromAsset.contract, network)
        );
    }, [fromAsset?.contract, network]);

    const shortAddress = useMemo(() => {
        if (!fromAsset?.contract) return '';
        if (network)
            return new Address(fromAsset.contract, network).toShortString();
        return shortenString(fromAsset.contract);
    }, [fromAsset?.contract, network]);

    return (
        <RowWrapper title={`${network?.display_name} - ${fromAsset?.asset}`}>
            {isValidAddress && fromAsset?.contract && network ? (
                <div className="text-sm group/addressItem text-secondary-text">
                    {addressContent ?? (
                        <AddressDetailsView
                            address={fromAsset.contract}
                            network={network}
                            shouldShowChevron={false}
                            readOnly
                        />
                    )}
                </div>
            ) : (
                <p className="text-sm text-secondary-text">{shortAddress}</p>
            )}
        </RowWrapper>
    );
};
