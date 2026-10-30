import { TransferBlock } from './TransferBlock';
import SubmitButton from '@/components/Buttons/submitButton';
import WalletMessage from './messages/Message';
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
import { FC, useEffect, useMemo, useRef, useState } from 'react';
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

export function useManualWithdrawController({
    swapBasicData,
    depositActions,
    refuel,
    partner,
    type,
    quote,
    isQuoteLoading,
}: Props, active = true) {
    const { wallets } = useWallet();
    const { createSwap, setSwapId, mutateDepositActions } = useSwapDataUpdate();
    const { swapDetails, depositActionsError } = useSwapDataState();
    const [retryingAddress, setRetryingAddress] = useState(false);
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
    const [copiedAddress, setCopiedAddress] = useState<string>();
    const wasActive = useRef(active);
    useEffect(() => {
        const becameEligible = active && !wasActive.current;
        wasActive.current = active;
        if (!becameEligible || loading) return;
        setShowQR(false);
        setIsPopoverOpen(false);
        setCopiedAddress(undefined);
        setSelectedFrom({ network: swapBasicData.source_network, token: swapBasicData.source_token });
    }, [active]);
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
    useLifecycleObservation(active && swapDetails?.id && depositAddress && !loading ? AWAITING_USER_DEPOSIT : undefined, lifecycleContext)

    const handleCopy = () => {
        if (depositAddress) {
            setCopiedAddress(depositAddress);
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
                useGasless: false,
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
    } = useExchangeNetworks(active ? exchangeNetworkParams : {});

    // Undefined actions without an error are still loading. A settled empty or
    // incompatible response cannot produce instructions and needs recovery.
    const addressUnavailable = !!swapDetails?.id && !depositAddress && !loading
        && (depositActions !== undefined || !!depositActionsError);
    const retryAddress = async () => {
        if (retryingAddress) {
            return;
        }
        setRetryingAddress(true);
        try {
            await mutateDepositActions();
        } catch {
            // The shared action state owns the error and keeps recovery visible.
        } finally {
            setRetryingAddress(false);
        }
    };
    if (addressUnavailable) {
        return {
            controls: null,
            footer: <TransferBlock reasonCode="deposit_actions_unavailable" path="ManualWithdraw"
                reason={depositActionsError || 'The deposit actions do not contain a usable deposit address'}>
                <div className="flex flex-col gap-2 w-full">
                    <WalletMessage status="error" header="Deposit address unavailable"
                        details="We couldn’t generate your deposit address. Try again to reload it." />
                    <SubmitButton type="button" onClick={retryAddress} isSubmitting={retryingAddress}>
                        Try again
                    </SubmitButton>
                </div>
            </TransferBlock>,
        };
    }

    return { controls: (
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
        ), footer: <ManualDepositButtonView loading={!depositAddress || loading} copied={copied && copiedAddress === depositAddress} onCopy={handleCopy} /> };
}
const ManualWithdraw: FC<Props> = props => {
    const model = useManualWithdrawController(props);
    return <>{model.controls}<Widget.Footer sticky={props.type === 'widget'}>{model.footer}</Widget.Footer></>;
};
export default ManualWithdraw;
