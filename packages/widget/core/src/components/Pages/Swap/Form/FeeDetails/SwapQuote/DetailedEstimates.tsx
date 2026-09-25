import { GasFeeView } from './GasFeeView';
import { DetailedEstimatesView } from './DetailedEstimatesView';
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon';
import { useSelectedAccount } from '@/context/swapAccounts';
import { isGaslessCapableRoute } from '@/helpers/gasless';
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { QuoteReward, SwapQuote } from '@/lib/apiClients/layerSwapApiClient';
import useSWRGas from '@/lib/gases/useSWRGas';
import useSWRNftBalance from '@/lib/nft/useSWRNftBalance';
import { useGaslessPreferenceStore } from '@/stores/gaslessPreferenceStore';
import { FC, useMemo } from 'react';
import { SwapValues } from '..';
import { Slippage } from '../Slippage';

type DetailedEstimatesProps = {
    quote: SwapQuote | undefined;
    reward?: QuoteReward;
    swapValues: SwapValues;
    variant?: 'base' | 'extended';
};

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote,
    reward,
    swapValues: values,
    variant,
}) => {
    const shouldCheckNFT =
        reward?.campaign_type === 'for_nft_holders' &&
        reward?.nft_contract_address;
    const {
        balance: nftBalance,
        isLoading,
        error,
    } = useSWRNftBalance(
        values.destination_address || '',
        values.to,
        reward?.nft_contract_address || '',
    );

    const showReward = !(
        !reward ||
        !values.destination_address ||
        (shouldCheckNFT &&
            (isLoading || error || nftBalance === undefined || nftBalance <= 0))
    );
    return (
        <DetailedEstimatesView
            quote={quote}
            reward={reward}
            values={values}
            variant={variant}
            showReward={showReward}
            gasFee={<GasFee values={values} quote={quote} />}
            slippage={<Slippage quoteData={quote} values={values} />}
            tokenAddress={
                values.fromAsset?.contract &&
                values.from &&
                Address.isValid(values.fromAsset.contract, values.from) ? (
                    <ExtendedAddress
                        address={values.fromAsset.contract}
                        network={values.from}
                        showDetails={false}
                        shouldShowChevron={false}
                    />
                ) : undefined
            }
        />
    );
};

export const GasFee = ({
    values,
    quote,
    enabled = true,
}: {
    values: SwapValues;
    quote: SwapQuote | undefined;
    enabled?: boolean;
}) => {
    const isCEX = !!values.fromExchange;
    const { provider } = useWallet(
        !isCEX ? values.from : undefined,
        'withdrawal',
    );

    const selectedSourceAccount = useSelectedAccount('from', values.from?.name);
    const wallet = useMemo(
        () =>
            provider?.connectedWallets?.find(
                (w) => w.id === selectedSourceAccount?.id,
            ),
        [provider?.connectedWallets, selectedSourceAccount],
    );

    const { gasData, isGasLoading } = useSWRGas(
        wallet?.address,
        values.from,
        values.fromAsset,
        undefined,
        undefined,
        { enabled },
    );
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token, quote);
    const gasFeeInUsd =
        gasData?.gas && gasTokenPriceInUsd
            ? gasData.gas * gasTokenPriceInUsd
            : null;
    const gas = gasData?.gas;
    const gasCurrencyName = gasData?.token?.asset;

    const gaslessEnabled = useGaslessPreferenceStore((s) => s.gaslessEnabled);
    const setGaslessEnabled = useGaslessPreferenceStore(
        (s) => s.setGaslessEnabled,
    );

    // Paymaster covers source-chain gas on the gasless route.
    const sourceIsSupported = !!wallet?.asSourceSupportedNetworks?.some(
        (n) => n === values.from?.name,
    );
    const isGaslessCapable = isGaslessCapableRoute({
        depositMethod: values.depositMethod,
        supportsGaslessDeposit: values.fromAsset?.supports_gasless_deposit,
        sourceTokenContract: values.fromAsset?.contract,
        gaslessStandard: values.fromAsset?.gasless_standard,
        sourceIsSupported,
        sourceAddress: selectedSourceAccount?.address,
    });
    return (
        <GasFeeView
            gasFeeInUsd={gasFeeInUsd}
            gas={gas}
            gasCurrencyName={gasCurrencyName}
            isGasLoading={isGasLoading}
            isGaslessCapable={isGaslessCapable}
            gaslessEnabled={gaslessEnabled}
            setGaslessEnabled={setGaslessEnabled}
        />
    );
};
