import { ManualSourceSelectorView } from './Presentation/ManualSourceSelectorView';
import { DepositQRCodeView } from './Presentation/DepositQRCodeView';
import { ManualDepositButtonView } from './Presentation/ManualDepositButtonView';
import { Partner } from '@/Models/Partner';
import { ExtendedAddress } from '@/components/Input/Address/AddressPicker/AddressWithIcon';
import { Widget } from '@/components/Widget/Index';
import { useAsyncModal } from '@/context/asyncModal';
import { useInitialSettings } from '@/context/settings';
import { useSwapDataState, useSwapDataUpdate } from '@/context/swap';
import { resolveDepositAddress } from '@/helpers/depositActions';
import useExchangeNetworks from '@/hooks/useExchangeNetworks';
import useWallet from '@/hooks/useWallet';
import { Address } from '@/lib/address/Address';
import { useAddressName } from '@/stores/addressBookStore';
import {
    DepositAction,
    SwapBasicData,
    SwapQuote,
} from '@/lib/apiClients/layerSwapApiClient';
import { useCopyClipboard } from '@layerswap/ui-kit';
import { CopyButton } from '@layerswap/ui-kit/components';
import {
    Network,
    NetworkRoute,
    Token,
    type Refuel,
} from '@layerswap/widget-types';
import { FC, useMemo, useState } from 'react';
import QuoteDetails from '../Form/FeeDetails';
import { SwapFormValues } from '../Form/SwapFormValues';
import { ManualInstructionsView } from './Presentation/ManualInstructionsView';
import { handleLimitsUpdate } from './QuoteUpdate';
import { useCallbacks } from '@/context/callbackProvider'
import { lifecycleContextFromSwap } from '@/lib/swapLifecycle'
import { type ObservedLifecycleEvent, useLifecycleObservation } from '@/hooks/useLifecycleObservation'

const AWAITING_USER_DEPOSIT: ObservedLifecycleEvent = {
    step: 'awaiting_user_deposit',
    stage: 'input_transfer',
    outcome: 'pending',
    path: 'ManualWithdraw',
    action: 'manual_deposit',
}

interface Props {
    swapBasicData: SwapBasicData;
    depositActions: DepositAction[] | undefined;
    refuel?: Refuel | undefined;
    partner?: Partner;
    type: 'widget' | 'contained';
    quote?: SwapQuote;
    isQuoteLoading?: boolean;
}

const ManualWithdraw: FC<Props> = ({
    swapBasicData,
    depositActions,
    refuel,
    partner,
    type,
    quote,
    isQuoteLoading,
}) => {
    const { wallets } = useWallet();
    const { createSwap, setSwapId } = useSwapDataUpdate();
    const { swapDetails } = useSwapDataState();
    const { onSwapLifecycle } = useCallbacks();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [selectedFrom, setSelectedFrom] = useState<{
        network: Network | null;
        token: Token | null;
    }>({
        network: swapBasicData?.source_network ?? null,
        token: swapBasicData?.source_token ?? null,
    });

    const [loading, setLoading] = useState(false);
    const { getConfirmation } = useAsyncModal();

    const [showQR, setShowQR] = useState(false);
    const [copied, copy] = useCopyClipboard();
    const initialSettings = useInitialSettings();
    const depositAddress = resolveDepositAddress(
        swapBasicData?.source_network,
        depositActions,
    );
    const { destination_address: destinationAddressFromQuery } =
        initialSettings;

    const destinationWallet = wallets.find(
        (wallet) =>
            wallet.address.toLowerCase() ==
            swapBasicData?.destination_address?.toLowerCase(),
    );
    const savedName = useAddressName(
        swapBasicData.destination_address,
        swapBasicData.destination_network,
    );
    const addressProviderIcon =
        destinationAddressFromQuery &&
        partner?.is_wallet &&
        Address.equals(
            destinationAddressFromQuery,
            swapBasicData?.destination_address!,
            swapBasicData?.destination_network || null,
        ) &&
        partner?.logo;

    const lifecycleContext = useMemo(
        () => lifecycleContextFromSwap(swapBasicData, swapDetails),
        [
            swapBasicData.destination_address,
            swapBasicData.destination_network.name,
            swapBasicData.destination_token.symbol,
            swapBasicData.requested_amount,
            swapBasicData.source_network.name,
            swapBasicData.source_token.symbol,
            swapBasicData.use_deposit_address,
            swapDetails?.id,
            swapDetails?.source_address,
        ],
    )

    // A source address arriving later enriches the report but never repeats it.
    useLifecycleObservation(swapDetails?.id ? AWAITING_USER_DEPOSIT : undefined, lifecycleContext)

    const handleCopy = () => {
        if (depositAddress) {
            copy(depositAddress);
            onSwapLifecycle({
                step: 'deposit_address_copied',
                stage: 'input_transfer',
                outcome: 'pending',
                path: 'ManualWithdraw',
                action: 'copy_deposit_address',
                ...lifecycleContext,
            })
        }
    };

    const swapValues = useMemo<SwapFormValues>(() => {
        const fromNetwork = (selectedFrom.network ??
            swapBasicData?.source_network) as NetworkRoute | undefined;
        const fromToken = selectedFrom.token ?? swapBasicData?.source_token;

        return {
            amount: swapBasicData?.requested_amount?.toString(),
            from: fromNetwork,
            to: swapBasicData?.destination_network as NetworkRoute,
            fromAsset: fromToken,
            toAsset: swapBasicData?.destination_token,
            refuel: !!refuel,
            destination_address: swapBasicData?.destination_address,
            fromExchange: swapBasicData?.source_exchange,
            depositMethod: 'deposit_address',
        };
    }, [selectedFrom.network, selectedFrom.token, swapBasicData, refuel]);

    const handleClick = async (network: Network, token: Token) => {
        const nextSwapValues: SwapFormValues = {
            amount: swapBasicData?.requested_amount?.toString(),
            from: network as NetworkRoute,
            to: swapBasicData?.destination_network as NetworkRoute,
            fromAsset: token,
            toAsset: swapBasicData?.destination_token,
            refuel: !!refuel,
            destination_address: swapBasicData?.destination_address,
            fromExchange: swapBasicData?.source_exchange,
            depositMethod: 'deposit_address',
        };

        try {
            setLoading(true);

            await handleLimitsUpdate({
                swapValues: nextSwapValues,
                network,
                token,
                getConfirmation,
            });

            const swapData = await createSwap(nextSwapValues, initialSettings);
            const swapId = swapData?.swap?.id;
            if (!swapId) throw new Error('Swap ID is undefined');

            setSwapId(swapId);
            setSelectedFrom({ network, token });
            setIsPopoverOpen(false);
        } catch (e) {
            console.error('Swap creation error:', e);
        } finally {
            setLoading(false);
        }
    };

    const exchangeNetworkParams = useMemo(
        () => ({
            fromExchange: swapBasicData?.source_exchange?.name,
            to: swapBasicData?.destination_network?.name,
            toAsset: swapBasicData?.destination_token?.symbol,
        }),
        [swapBasicData],
    );

    const {
        networks: withdrawalNetworks,
        isLoading: exchangeSourceNetworksLoading,
    } = useExchangeNetworks(exchangeNetworkParams);

    return (
        <>
            <ManualInstructionsView
                swapBasicData={swapBasicData}
                quote={quote}
                loading={loading || exchangeSourceNetworksLoading}
                depositAddress={depositAddress}
                sourceSelector={
                    <ManualSourceSelectorView
                        network={
                            selectedFrom.network ?? swapBasicData.source_network
                        }
                        withdrawalNetworks={withdrawalNetworks}
                        isPopoverOpen={isPopoverOpen}
                        setIsPopoverOpen={setIsPopoverOpen}
                        onSelect={handleClick}
                    />
                }
                amountCopy={
                    <CopyButton
                        toCopy={swapBasicData.requested_amount}
                        iconClassName="text-secondary-text"
                    />
                }
                addressCopy={
                    <CopyButton
                        toCopy={depositAddress || ''}
                        className="flex"
                    />
                }
                qr={
                    <DepositQRCodeView
                        depositAddress={depositAddress}
                        showQR={showQR}
                        setShowQR={setShowQR}
                    />
                }
                destinationAddress={
                    swapBasicData?.destination_network &&
                    Address.isValid(
                        swapBasicData?.destination_address,
                        swapBasicData?.destination_network,
                    ) ? (
                        <ExtendedAddress
                            address={swapBasicData?.destination_address}
                            network={swapBasicData?.destination_network}
                            shouldShowChevron={false}
                        />
                    ) : undefined
                }
                recipient={{
                    wallet: destinationWallet,
                    partnerIcon: addressProviderIcon || undefined,
                    savedName,
                }}
                quoteDetails={
                    <QuoteDetails
                        swapValues={swapValues}
                        quote={quote}
                        isQuoteLoading={isQuoteLoading}
                    />
                }
            />
            <Widget.Footer sticky={type === 'widget'}>
                <ManualDepositButtonView copied={copied} onCopy={handleCopy} />
            </Widget.Footer>
        </>
    );
};
export default ManualWithdraw;
