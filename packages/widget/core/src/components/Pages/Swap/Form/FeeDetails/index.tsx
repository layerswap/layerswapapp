import { useSelectedAccount } from '@/context/swapAccounts';
import { isGaslessCapableRoute } from '@/helpers/gasless';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import useWallet from '@/hooks/useWallet';
import { QuoteReward, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import useSWRGas from '@/lib/gases/useSWRGas';
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { Network } from '@layerswap/widget-types';
import { FC, useState } from 'react';
import { ManualQuoteView } from '../../Withdraw/Presentation/ManualQuoteView';
import { QuoteDetailsSummary } from '../../Withdraw/Presentation/QuoteDetailsSummary';
import { SwapFormValues } from '../SwapFormValues';
import { DetailedEstimates } from './SwapQuote/DetailedEstimates';

export interface SwapValues extends Omit<SwapFormValues, 'from' | 'to'> {
    from?: Network;
    to?: Network;
}

export interface QuoteComponentProps {
    quote: SwapQuote | undefined;
    isQuoteLoading?: boolean;
    swapValues: SwapValues;
    destination?: Network;
    destinationAddress?: string;
    reward?: QuoteReward | undefined;
    variant?: 'extended' | 'base';
    triggerClassnames?: string;
}

export default function QuoteDetails({
    swapValues: values,
    quote,
    isQuoteLoading,
    reward,
    variant = 'extended',
    triggerClassnames,
}: QuoteComponentProps) {
    const {
        toAsset,
        fromAsset: fromCurrency,
        destination_address,
    } = values || {};
    const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(false);

    return (
        <ManualQuoteView
            available={!!quote}
            isAccordionOpen={isAccordionOpen}
            setIsAccordionOpen={setIsAccordionOpen}
            isQuoteLoading={isQuoteLoading}
            triggerClassnames={triggerClassnames}
            detailsButton={
                <DetailsButton
                    quote={quote}
                    isQuoteLoading={isQuoteLoading}
                    swapValues={values}
                    destination={values.to}
                    destinationAddress={destination_address}
                    reward={reward}
                />
            }
            details={
                (quote || isQuoteLoading) &&
                fromCurrency &&
                toAsset && (
                    <DetailedEstimates
                        swapValues={values}
                        quote={quote}
                        variant={variant}
                        reward={reward}
                    />
                )
            }
        />
    );
}

export const DetailsButton: FC<QuoteComponentProps & { enabled?: boolean }> = ({
    quote,
    reward,
    isQuoteLoading,
    swapValues: values,
    destination,
    destinationAddress,
    enabled = true,
}) => {
    const isCEX = !!values.fromExchange;
    const sourceAccountNetwork = !isCEX ? values.from : undefined;
    const selectedSourceAccount = useSelectedAccount(
        'from',
        sourceAccountNetwork?.name,
    );
    const { wallets } = useWallet(quote?.source_network, 'withdrawal');
    const wallet = wallets.find((w) => w.id === selectedSourceAccount?.id);
    const { gasData: gasData } = useSWRGas(
        selectedSourceAccount?.address,
        values.from,
        values.fromAsset,
        values.amount,
        wallet,
        { enabled },
    );
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote);
    const gasFeeInUsd =
        gasData && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null;
    const averageCompletionTime = quote?.avg_completion_time;

    const gaslessEnabled = useGaslessPreferenceStore((s) => s.gaslessEnabled);
    const sourceIsSupported = !!wallet?.asSourceSupportedNetworks?.some(
        (n) => n === values.from?.name,
    );
    const isGasless =
        isGaslessCapableRoute({
            depositMethod: values.depositMethod,
            supportsGaslessDeposit: values.fromAsset?.supports_gasless_deposit,
            sourceTokenContract: values.fromAsset?.contract,
            gaslessStandard: values.fromAsset?.gasless_standard,
            sourceIsSupported,
            sourceAddress: selectedSourceAccount?.address,
        }) && gaslessEnabled;

    const shouldCheckNFT =
        reward?.campaign_type === 'for_nft_holders' &&
        reward?.nft_contract_address;
    const {
        balance: nftBalance,
        isLoading,
        error,
    } = useSWRNftBalance(
        destinationAddress || '',
        destination,
        reward?.nft_contract_address || '',
    );

    return (
        <QuoteDetailsSummary
            gasFeeInUsd={gasFeeInUsd}
            isGasless={isGasless}
            isQuoteLoading={isQuoteLoading}
            isExchange={!!values.fromExchange}
            averageCompletionTime={averageCompletionTime}
            reward={reward}
            showReward={
                !shouldCheckNFT ||
                (!isLoading &&
                    !error &&
                    nftBalance !== undefined &&
                    nftBalance > 0)
            }
        />
    );
};
