import { FC, useEffect, useMemo, useRef, useState } from "react";
import ValidationError from "@/components/validationError";
import { Widget } from "@/components/Widget/Index";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Form, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import { ChevronDown, ChevronUp, Clock, Copy, Check, Plus} from "lucide-react";
import { useValidationContext } from "@/context/validationContext";
import useWallet from "@/hooks/useWallet";
import { Network, NetworkRoute, NetworkRouteToken, Token } from "@/Models/Network";
import { SelectAccountProps } from "@/Models/WalletProvider";
import { SwapStatus } from "@/Models/SwapStatus";
import AddressIcon from "@/components/AddressIcon";
import { Address as AddressClass } from "@/lib/address";
import shortenString from "@/components/utils/ShortenString";
import useAutoSourceRoute from "@/hooks/useAutoSourceRoute";
import useDepositAddressSources from "@/hooks/useDepositAddressSources";
import useDepositAddressDestinations from "@/hooks/useDepositAddressDestinations";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useSettingsState } from "@/context/settings";
import { useQueryState } from "@/context/query";
import { useConnectModal } from "@/components/WalletModal";
import { useSelectedAccount, useSelectSwapAccount } from "@/context/swapAccounts";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import VaulDrawer from "@/components/modal/vaulModal";
import { WalletItem } from "@/components/Wallet/WalletsList";
import Processing from "@/components/Swap/Withdraw/Processing";
import { DepositAction, TransactionType } from "@/lib/apiClients/layerSwapApiClient";
import { useDetailedQuote, DetailedQuoteModel } from "@/hooks/useDetailedQuote";
import { Selector, SelectorContent, SelectorTrigger } from "@/components/Select/Selector/Index";
import { SelectedRouteDisplay } from "@/components/Input/RoutePicker/Routes";
import { Content } from "@/components/Input/RoutePicker/Content";
import { groupRoutes } from "@/hooks/useFormRoutes";
import { useRecentNetworksStore } from "@/stores/recentRoutesStore";
import { useRouteSortingStore } from "@/stores/routeSortingStore";
import useSuggestionsLimit from "@/hooks/useSuggestionsLimit";
import SubmitButton from "@/components/buttons/submitButton";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import { QRCodeSVG } from "qrcode.react";
import { AnimatePresence, motion } from "framer-motion";
import { formatPercent } from "@/components/utils/formatPercent";
import { formatUsd } from "@/components/utils/formatUsdAmount";

type Props = {
    partner?: Partner;
};

const DepositAddressForm: FC<Props> = () => {
    const {
        values, isSubmitting, setFieldValue, submitForm
    } = useFormikContext<SwapFormValues>();

    const { to: destination, destination_address, toAsset: toCurrency, from, fromAsset } = values || {};

    const { isAutoSourceUpdating } = useAutoSourceRoute();

    const { wallets } = useWallet();
    const hasWallet = wallets.length > 0;
    const { connect, isWalletModalOpen, cancel } = useConnectModal();
    const settings = useSettingsState();
    const query = useQueryState();

    const connectedAutofillNetworks = useMemo(() => {
        const set = new Set<string>();
        wallets.forEach(w => {
            w.autofillSupportedNetworks?.forEach(n => set.add(n.toLowerCase()));
        });
        return set;
    }, [wallets]);

    // When the user lands on this flow with no wallet at all, force a
    // non-dismissable connect modal — there's nothing for the picker to show
    // until at least one wallet is connected. The modal is torn down when
    // either a wallet appears (cleanup) or the form unmounts (user navigated
    // away). `isWalletModalOpen` is read via a ref so its updates don't
    // re-trigger this effect and cancel our just-opened modal.
    const isWalletModalOpenRef = useRef(isWalletModalOpen);
    useEffect(() => { isWalletModalOpenRef.current = isWalletModalOpen; });
    useEffect(() => {
        if (hasWallet) return;
        if (isWalletModalOpenRef.current) return;
        connect(undefined, { dismissible: false });
        return () => { cancel(); };
    }, [hasWallet, connect, cancel]);

    // Apply default destination/source when a wallet is present and the form
    // is still blank. `generateSwapInitialValues` is the same helper used by
    // Formik's initialValues, so the deposit-address flow lands on the same
    // defaults whether the wallet was present from mount or connected later.
    useEffect(() => {
        if (!hasWallet || destination) return;
        const defaults = generateSwapInitialValues(settings, query, 'deposit-address', connectedAutofillNetworks);
        if (!defaults.to || !defaults.toAsset) return;
        setFieldValue('to', defaults.to, false);
        setFieldValue('toAsset', defaults.toAsset, true);
    }, [hasWallet, destination, settings, query, connectedAutofillNetworks, setFieldValue]);

    // Auto-fill `destination_address` from the current default wallet account
    // for the chosen destination. The picker can override this by calling
    // `selectDestinationAccount`, which updates `destinationAccount` and feeds
    // back through this effect (so the picker's choice wins).
    const destinationAccount = useSelectedAccount("to", destination?.name);
    useEffect(() => {
        if (!destination) return;
        const next = destinationAccount?.address ?? '';
        if (destination_address?.toLowerCase() === next.toLowerCase()) return;
        setFieldValue('destination_address', next, true);
    }, [destination?.name, destinationAccount?.address, destination_address, setFieldValue]);

    useEffect(() => {
        setFieldValue('depositMethod', 'deposit_address', true)
    }, [])

    const { routeValidation, formValidation } = useValidationContext();
    const { swapId, swapBasicData, swapDetails, depositActionsResponse, refuel } = useSwapDataState();
    const { setSwapId } = useSwapDataUpdate();

    const isValid = !formValidation.message;
    const error = formValidation.message;

    const allFieldsReady = !!(from && fromAsset && destination && toCurrency && destination_address);

    const swapMatchesValues = useMemo(() => {
        if (!swapId || !swapBasicData || !allFieldsReady) return false;
        return (
            swapBasicData.source_network?.name === from?.name &&
            swapBasicData.source_token?.symbol === fromAsset?.symbol &&
            swapBasicData.destination_network?.name === destination?.name &&
            swapBasicData.destination_token?.symbol === toCurrency?.symbol &&
            swapBasicData.destination_address?.toLowerCase() === destination_address?.toLowerCase()
        );
    }, [swapId, swapBasicData, from, fromAsset, destination, toCurrency, destination_address, allFieldsReady]);

    // Drop the previous swap as soon as the form values diverge from it so the
    // inline deposit address doesn't briefly point at a stale swap.
    useEffect(() => {
        if (swapId && !swapMatchesValues) {
            setSwapId(undefined);
        }
    }, [swapId, swapMatchesValues, setSwapId]);

    // Auto-create the swap once form is complete. The ref tracks the last
    // attempted (from, fromAsset, to, toAsset, address) tuple so we don't loop
    // when the API call fails — but we clear it on every successful create so
    // re-entering the same key later (e.g., clear → retype same address) tries
    // again.
    const attemptedKeyRef = useRef<string | null>(null);
    const fieldKey = allFieldsReady
        ? `${from?.name}|${fromAsset?.symbol}|${destination?.name}|${toCurrency?.symbol}|${destination_address?.toLowerCase()}`
        : null;

    useEffect(() => {
        if (swapId) attemptedKeyRef.current = null;
    }, [swapId]);

    // Skip the auto-submit only while `useAutoSourceRoute` is actively swapping
    // the source for a fresh destination. Any other failure (real route problem,
    // server error, etc.) still flows through to the toast so the user sees it.
    useEffect(() => {
        if (!fieldKey || swapId || isSubmitting || !isValid) return;
        if (isAutoSourceUpdating) return;
        if (attemptedKeyRef.current === fieldKey) return;
        attemptedKeyRef.current = fieldKey;
        submitForm();
    }, [fieldKey, swapId, isSubmitting, isValid, submitForm, isAutoSourceUpdating]);

    const depositAddress = resolveDepositAddress(from, depositActionsResponse);

    // Show the Processing panel once the swap has moved past the
    // "user-needs-to-send" phase (i.e. any status other than created /
    // user_transfer_pending). Until then, keep showing the QR + fees.
    const isPostUserTransferStatus = !!swapDetails?.status
        && swapDetails.status !== SwapStatus.UserTransferPending
        && swapDetails.status !== SwapStatus.Created;
    const isProcessing = !!swapId && swapMatchesValues && isPostUserTransferStatus;
    // The Processing panel renders "Transfer complete" as soon as an output
    // transaction exists, even before swapStatus flips to Completed. Mirror
    // that here so the "Deposit more" button appears at the same time.
    const hasOutputTx = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Output);
    const isCompleted = !!swapId && swapMatchesValues && (swapDetails?.status === SwapStatus.Completed || hasOutputTx);
    const showDepositInfo = !!swapId && swapMatchesValues && !isProcessing;

    // Reset the swap so the auto-submit effect creates a fresh one for the
    // same form values. `attemptedKeyRef` must be cleared explicitly because
    // it caches the last (from, fromAsset, to, toAsset, address) we tried.
    const handleDepositMore = () => {
        attemptedKeyRef.current = null;
        setSwapId(undefined);
    };

    return (
        <>
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full gap-2">
                {isProcessing ? (
                    <Processing />
                ) : (
                    <Widget.Content>
                        <div className="w-full flex flex-col justify-between flex-1 relative min-h-[240px]">
                            <div className="flex flex-col w-full gap-3">

                                {/* Source (Pay from) */}
                                <PayFromPicker
                                    selectedSource={from && fromAsset ? { network: from as unknown as NetworkRoute, token: fromAsset as NetworkRouteToken } : null}
                                    onSourceChange={(network, token) => {
                                        setSwapId(undefined);
                                        setFieldValue('from', network, false);
                                        setFieldValue('fromAsset', token, true);
                                    }}
                                    destinationNetwork={destination?.name}
                                    destinationToken={toCurrency?.symbol}
                                />

                                {/* Destination network/token + recipient address share one "Receive" row */}
                                <ReceivePicker
                                    selectedDestination={destination && toCurrency ? { network: destination as unknown as NetworkRoute, token: toCurrency as NetworkRouteToken } : null}
                                    onDestinationChange={(network, token) => {
                                        setSwapId(undefined);
                                        setFieldValue('to', network, false);
                                        setFieldValue('toAsset', token, true);
                                    }}
                                    destinationAddress={destination_address}
                                    destination={destination}
                                />

                                {/* Deposit address + QR + fees once everything is ready */}
                                {showDepositInfo && (
                                    <DepositAddressInfo
                                        sourceNetwork={from?.name}
                                        sourceToken={fromAsset?.symbol}
                                        destinationNetwork={destination?.name}
                                        destinationToken={toCurrency?.symbol}
                                        destinationAddress={destination_address}
                                        refuel={!!refuel || !!swapBasicData?.refuel}
                                        depositAddress={depositAddress}
                                        isCreatingSwap={false}
                                    />
                                )}
                            </div>
                            <div>
                                {routeValidation.message ? <ValidationError /> : null}
                            </div>
                        </div>
                    </Widget.Content>
                )}
                <Widget.Footer showPoweredBy>
                    <DepositAddressFormButton
                        values={values}
                        isValid={isValid}
                        error={error}
                        isSubmitting={isSubmitting}
                        showDepositInfo={showDepositInfo}
                        depositAddress={depositAddress}
                        isProcessing={isProcessing}
                        isCompleted={isCompleted}
                        onDepositMore={handleDepositMore}
                    />
                </Widget.Footer>
            </Form>
        </>
    )
}

export default DepositAddressForm;

type PayFromPickerProps = {
    selectedSource: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onSourceChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
}

const PayFromPicker: FC<PayFromPickerProps> = ({ selectedSource, onSourceChange, destinationNetwork, destinationToken }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { wallets } = useWallet();
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);

    const { availableRoutes } = useDepositAddressAvailableRoutes(destinationNetwork, destinationToken);

    const routeElements = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'from',
            balances: null,
            groupBy: 'token',
            recents: routesHistory,
            balancesLoaded: false,
            search: searchQuery,
            suggestionsLimit,
            sortingOption,
            skipBalanceGate: true,
            hideSuggestions: true,
        });
    }, [availableRoutes, searchQuery, routesHistory, suggestionsLimit, sortingOption]);

    // Disable until the destination resolves a non-empty source list.
    const hasOptions = availableRoutes.length > 0;
    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-secondary-text tracking-wide">Send</span>
            <div className="flex-1 min-w-0">
                <Selector>
                    <SelectorTrigger disabled={!hasOptions || !hasMultipleOptions} className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors">
                        <SelectedRouteDisplay
                            route={selectedSource?.network}
                            token={selectedSource?.token}
                            placeholder="Select source"
                        />
                    </SelectorTrigger>
                    <SelectorContent isLoading={false}>
                        {({ closeModal }) => (
                            <Content
                                onSelect={(r, t) => { onSourceChange(r, t); closeModal(); }}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                rowElements={routeElements}
                                direction="from"
                                selectedRoute={selectedSource?.network.name}
                                selectedToken={selectedSource?.token.symbol}
                                hideTokenSwitch
                                hideBalances
                            />
                        )}
                    </SelectorContent>
                </Selector>
            </div>
        </div>
    );
};

type ReceivePickerProps = {
    selectedDestination: { network: NetworkRoute; token: NetworkRouteToken } | null;
    onDestinationChange: (network: NetworkRoute, token: NetworkRouteToken) => void;
    destinationAddress: string | undefined;
    destination: NetworkRoute | undefined;
}

const ReceivePicker: FC<ReceivePickerProps> = ({
    selectedDestination,
    onDestinationChange,
    destinationAddress,
    destination,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { wallets } = useWallet();
    const { suggestionsLimit } = useSuggestionsLimit({ hasWallet: wallets.length > 0 });
    const sortingOption = useRouteSortingStore((s) => s.sortingOption);
    const routesHistory = useRecentNetworksStore(state => state.recentRoutes);

    const { data: destinationRoutesData } = useDepositAddressDestinations();

    const availableRoutes = useMemo(() => {
        const routes = destinationRoutesData?.data;
        if (!routes) return [];
        return routes
            .map(route => ({ ...route, tokens: route.tokens?.filter(t => t.status === 'active') ?? [] }))
            .filter(route => route.tokens.length > 0);
    }, [destinationRoutesData]);

    const routeElements = useMemo(() => {
        return groupRoutes({
            routes: availableRoutes,
            direction: 'to',
            balances: null,
            groupBy: 'token',
            recents: routesHistory,
            balancesLoaded: false,
            search: searchQuery,
            suggestionsLimit,
            sortingOption,
            skipBalanceGate: true,
            hideSuggestions: true,
        });
    }, [availableRoutes, searchQuery, routesHistory, suggestionsLimit, sortingOption]);

    const hasMultipleOptions = availableRoutes.length > 1 || availableRoutes.some(r => r.tokens.length > 1);

    return (
        <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-secondary-text tracking-wide">Receive</span>
            <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <Selector>
                        <SelectorTrigger disabled={!hasMultipleOptions} className="bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors">
                            <SelectedRouteDisplay
                                route={selectedDestination?.network}
                                token={selectedDestination?.token}
                                placeholder="Select destination"
                            />
                        </SelectorTrigger>
                        <SelectorContent isLoading={false}>
                            {({ closeModal }) => (
                                <Content
                                    onSelect={(r, t) => { onDestinationChange(r, t); closeModal(); }}
                                    searchQuery={searchQuery}
                                    setSearchQuery={setSearchQuery}
                                    rowElements={routeElements}
                                    direction="to"
                                    selectedRoute={selectedDestination?.network.name}
                                    selectedToken={selectedDestination?.token.symbol}
                                    hideTokenSwitch
                                    hideBalances
                                />
                            )}
                        </SelectorContent>
                    </Selector>
                </div>
                <div className="flex-1 min-w-0">
                    <DestinationWalletPicker
                        address={destinationAddress}
                        destination={destination}
                        token={selectedDestination?.token}
                    />
                </div>
            </div>
        </div>
    );
};

type DestinationWalletPickerProps = {
    address: string | undefined;
    destination: NetworkRoute | undefined;
    token: NetworkRouteToken | undefined;
}

const DestinationWalletPicker: FC<DestinationWalletPickerProps> = ({ address, destination, token }) => {
    const [open, setOpen] = useState(false);
    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const { wallets: allWallets, providers } = useWallet();
    const selectDestinationAccount = useSelectSwapAccount("to");
    const { connect } = useConnectModal();
    const account = useSelectedAccount("to", destination?.name);

    // When a destination is set, only show wallets that can autofill that
    // network. When destination is empty, fall back to every connected wallet
    // that supports autofill anywhere — that way the picker still works before
    // the user has picked a destination.
    const walletsToShow = useMemo(() => {
        if (destination) {
            return allWallets.filter(w => w.autofillSupportedNetworks?.some(n => n === destination.name));
        }
        return allWallets.filter(w => (w.autofillSupportedNetworks?.length ?? 0) > 0);
    }, [allWallets, destination?.name]);

    const provider = useMemo(() => {
        if (!destination) return undefined;
        return providers.find(p => p.autofillSupportedNetworks?.includes(destination.name));
    }, [providers, destination?.name]);

    const handleSelect = (props: SelectAccountProps) => {
        setFieldValue('destination_address', props.address, true);
        selectDestinationAccount({
            address: props.address,
            id: props.walletId,
            providerName: props.providerName,
        });
        setOpen(false);
    };

    const handleConnect = async () => {
        const result = await connect(provider);
        if (!result) return;
        const supportsDestination = !destination || result.autofillSupportedNetworks?.some(n => n === destination.name);
        if (supportsDestination) {
            handleSelect({
                address: result.address,
                walletId: result.id,
                providerName: result.providerName,
            });
        }
    };

    // When the destination changes to a network with no compatible wallet,
    // skip the picker drawer (which would only show "Connect new wallet") and
    // open the connect screen directly, scoped to that network's provider. We
    // track the destination we last auto-prompted for so dismissing without
    // connecting doesn't keep re-firing. Skipped when no wallet is connected
    // at all — the form's non-dismissable connect modal handles that case.
    const hasAnyWallet = allWallets.length > 0;
    const lastAutoPromptedForRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!hasAnyWallet) return;
        if (!destination) return;
        if (account?.address) return;
        if (lastAutoPromptedForRef.current === destination.name) return;
        lastAutoPromptedForRef.current = destination.name;
        handleConnect();
    }, [hasAnyWallet, destination?.name, account?.address]);

    const hasAddress = !!address;
    const WalletIcon = account?.icon;
    const walletName = account?.displayName?.split('-')[0] || 'Connected wallet';

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full bg-secondary-500 hover:bg-secondary-400/70 rounded-xl px-3.5 py-3 transition-colors flex items-center outline-hidden"
            >
                <div className="inline-flex items-center justify-center rounded-lg h-7 w-7 overflow-hidden shrink-0 bg-secondary-400 text-primary-text">
                    {hasAddress && WalletIcon ? (
                        <WalletIcon className="h-7 w-7 object-contain" />
                    ) : hasAddress && destination ? (
                        <AddressIcon
                            className="scale-150 h-7 w-7"
                            address={new AddressClass(address!, destination as unknown as Network).full}
                            size={28}
                        />
                    ) : (
                        <WalletPickerPlaceholder />
                    )}
                </div>
                <div className="ml-2 flex flex-col grow overflow-hidden min-w-0 text-left">
                    <p className={`text-base leading-5 font-medium truncate ${hasAddress ? 'text-primary-text' : 'text-secondary-text'}`}>
                        {hasAddress ? shortenString(address!) : 'Select wallet'}
                    </p>
                    <p className="text-secondary-text text-sm font-normal leading-4 truncate whitespace-nowrap">
                        {hasAddress ? walletName : 'Pick destination wallet'}
                    </p>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 text-secondary-text shrink-0" aria-hidden="true" />
            </button>
            <VaulDrawer
                show={open}
                setShow={setOpen}
                header="Receive in"
                modalId="destinationWallet"
                mode="fitHeight"
            >
                <VaulDrawer.Snap id="item-1" className="pb-4 space-y-3">
                    <button
                        type="button"
                        onClick={handleConnect}
                        className="w-full flex justify-center p-2 bg-secondary-500 rounded-md hover:bg-secondary-400"
                    >
                        <div className="flex items-center text-secondary-text gap-1 px-3 py-1">
                            <Plus className="h-4 w-4" />
                            <span className="text-sm">Connect new wallet</span>
                        </div>
                    </button>
                    {walletsToShow.length > 0 && (
                        <div className="flex flex-col gap-3">
                            {walletsToShow.map((wallet, index) => (
                                <WalletItem
                                    key={`${index}${wallet.providerName}`}
                                    account={wallet}
                                    selectable
                                    token={token as unknown as Token}
                                    network={destination as unknown as Network}
                                    onWalletSelect={handleSelect}
                                    selectedAddress={address}
                                />
                            ))}
                        </div>
                    )}
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    );
};

const WalletPickerPlaceholder = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-secondary-text">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
    </svg>
);

type DepositAddressInfoProps = {
    sourceNetwork: string | undefined;
    sourceToken: string | undefined;
    destinationNetwork: string | undefined;
    destinationToken: string | undefined;
    destinationAddress: string | undefined;
    refuel: boolean;
    depositAddress: string | undefined;
    isCreatingSwap: boolean;
}

const DepositAddressInfo: FC<DepositAddressInfoProps> = ({
    sourceNetwork,
    sourceToken,
    destinationNetwork,
    destinationToken,
    destinationAddress,
    refuel,
    depositAddress,
    isCreatingSwap,
}) => {
    const [copied, copy] = useCopyClipboard();
    const [isFeesExpanded, setIsFeesExpanded] = useState(false);

    useEffect(() => {
        setIsFeesExpanded(false);
    }, [sourceNetwork, sourceToken]);

    const { detailedQuotes, isLoading: isQuoteLoading } = useDetailedQuote({
        sourceNetwork,
        sourceToken,
        destinationNetwork,
        destinationToken,
        destinationAddress,
        refuel,
        useDepositAddress: true,
    });

    const sortedTiers = useMemo(() => {
        if (!detailedQuotes) return [];
        return [...detailedQuotes].sort((a, b) => a.min_amount - b.min_amount);
    }, [detailedQuotes]);

    const bestQuote = detailedQuotes?.[0];

    const minDepositDisplay = useMemo(() => {
        const min = sortedTiers[0]?.min_amount;
        if (!min || !sourceToken) return null;
        return `${formatTokenAmount(min)} ${sourceToken}`;
    }, [sortedTiers, sourceToken]);

    const maxDepositDisplay = useMemo(() => {
        const max = sortedTiers[sortedTiers.length - 1]?.max_amount;
        if (!max || !Number.isFinite(max) || !sourceToken) return null;
        return `${formatTokenAmount(max)} ${sourceToken}`;
    }, [sortedTiers, sourceToken]);

    const handleCopy = () => {
        if (depositAddress) copy(depositAddress);
    };

    const depositAddressParts = useMemo(() => {
        if (!depositAddress || depositAddress.length <= 8) {
            return { start: depositAddress ?? '', middle: '', end: '' };
        }
        return {
            start: depositAddress.slice(0, 4),
            middle: depositAddress.slice(4, -4),
            end: depositAddress.slice(-4),
        };
    }, [depositAddress]);

    return (
        <div className="flex flex-col gap-3">
            {/* Deposit address + QR */}
            <div>
                <div className="bg-secondary-500 rounded-xl p-3.5">
                    <div className="flex items-center bg-secondary-300 rounded-lg">
                        <div className="flex-1 min-w-0 flex justify-center">
                            {isCreatingSwap || !depositAddress ? (
                                <span className="inline-block bg-secondary-400 h-6 rounded animate-pulse w-32" />
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    aria-label={copied ? 'Copied' : 'Copy deposit address'}
                                    className="group/copy cursor-pointer text-center px-2 max-w-[200px]"
                                >
                                    <span
                                        className={`font-mono text-base break-all leading-snug transition-colors ${copied ? 'text-primary-text' : 'text-secondary-text group-hover/copy:text-primary-text'}`}
                                    >
                                        <span className="text-primary-text font-medium">{depositAddressParts.start}</span>
                                        {depositAddressParts.middle}
                                        <span className="text-primary-text font-medium">{depositAddressParts.end}</span>
                                        <span className="inline-flex items-center align-middle ml-1 w-4 h-4 relative">
                                            <AnimatePresence mode="wait" initial={false}>
                                                {copied ? (
                                                    <motion.span
                                                        key="check"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Check className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                ) : (
                                                    <motion.span
                                                        key="copy"
                                                        initial={{ scale: 0.6, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.6, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="absolute inset-0 inline-flex items-center justify-center"
                                                    >
                                                        <Copy className="h-4 w-4 text-secondary-text group-hover/copy:text-primary-text transition-colors" />
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </span>
                                    </span>
                                </button>
                            )}
                        </div>
                        <div className="shrink-0 bg-white p-1.5 rounded-lg border-4 border-secondary-500">
                            {isCreatingSwap || !depositAddress ? (
                                <div className="h-[140px] w-[140px] bg-secondary-100 rounded animate-pulse" />
                            ) : (
                                <QRCodeSVG
                                    className="rounded"
                                    value={depositAddress}
                                    includeMargin={false}
                                    size={140}
                                    level="H"
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fee + ETA summary */}
            <div className="bg-secondary-500 rounded-xl px-3.5 py-3">
                {isQuoteLoading && !bestQuote ? (
                    <div className="flex items-center gap-3 animate-pulse">
                        <div className="h-4 bg-secondary-400 rounded w-24" />
                        <div className="h-4 bg-secondary-400 rounded w-16" />
                    </div>
                ) : sortedTiers.length === 1 ? (
                    <div className="flex flex-col gap-1.5 text-xs text-secondary-text">
                        {minDepositDisplay && (
                            <div className="flex items-center justify-between">
                                <span>Minimum</span>
                                <span className="text-primary-text">{minDepositDisplay}</span>
                            </div>
                        )}
                        {maxDepositDisplay && (
                            <div className="flex items-center justify-between">
                                <span>Maximum</span>
                                <span className="text-primary-text">{maxDepositDisplay}</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-3 ${(minDepositDisplay || maxDepositDisplay) ? 'border-t border-secondary-400/40 pt-2 mt-0.5' : ''}`}>
                            <span className="flex items-center gap-1">
                                <span>{formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)}</span>
                            </span>
                            {bestQuote && (
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatCompletionTime(bestQuote.avg_completion_milliseconds)}</span>
                                </span>
                            )}
                        </div>
                    </div>
                ) : sortedTiers.length > 1 && sourceToken ? (
                    isFeesExpanded ? (
                        <div className="flex flex-col gap-2 text-xs">
                            {minDepositDisplay && (
                                <div className="flex items-center justify-between text-secondary-text">
                                    <span>Minimum</span>
                                    <span className="text-primary-text">{minDepositDisplay}</span>
                                </div>
                            )}
                            {maxDepositDisplay && (
                                <div className="flex items-center justify-between text-secondary-text">
                                    <span>Maximum</span>
                                    <span className="text-primary-text">{maxDepositDisplay}</span>
                                </div>
                            )}
                            <div className={`flex items-center justify-between text-secondary-text ${(minDepositDisplay || maxDepositDisplay) ? 'border-t border-secondary-400/40 pt-2' : ''}`}>
                                <span className="flex items-center gap-1">
                                    <span>{"Fees by amount"}</span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsFeesExpanded(false)}
                                    className="inline-flex items-center hover:text-primary-text transition-colors"
                                    aria-label="Hide fee tiers"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-0.5 border-t border-secondary-400/40 pt-2 pl-4">
                                {sortedTiers.map((tier, idx) => {
                                    const range = formatTierRange(
                                        tier,
                                        idx === 0,
                                        idx === sortedTiers.length - 1,
                                        sourceToken
                                    );
                                    const fee = formatFee(tier.total_percentage_fee, tier.total_fixed_fee_in_usd);
                                    return (
                                        <div
                                            key={`${tier.min_amount}-${tier.max_amount}`}
                                            className="flex items-center justify-between gap-4 text-xs"
                                        >
                                            <span className="text-secondary-text">{range}</span>
                                            <span className="flex items-center gap-3">
                                                <span className="text-primary-text">{fee}</span>
                                                <span className="tabular-nums min-w-14 text-right text-secondary-text/80">
                                                    {formatCompletionTime(tier.avg_completion_milliseconds)}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5 text-xs text-secondary-text">
                            {minDepositDisplay && (
                                <div className="flex items-center justify-between">
                                    <span>Minimum</span>
                                    <span className="text-primary-text">{minDepositDisplay}</span>
                                </div>
                            )}
                            {maxDepositDisplay && (
                                <div className="flex items-center justify-between">
                                    <span>Maximum</span>
                                    <span className="text-primary-text">{maxDepositDisplay}</span>
                                </div>
                            )}
                            <div className={`flex items-center gap-3 ${(minDepositDisplay || maxDepositDisplay) ? 'border-t border-secondary-400/40 pt-2 mt-0.5' : ''}`}>
                                <span className="flex items-center gap-1 min-w-0">
                                    <span className="text-primary-text">{formatFee(sortedTiers[0].total_percentage_fee, sortedTiers[0].total_fixed_fee_in_usd)}</span>
                                    <span className="truncate">{`· ${formatTierRange(sortedTiers[0], true, false, sourceToken)}`}</span>
                                </span>
                                <span className="flex items-center gap-1 ml-auto shrink-0">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatCompletionTime(sortedTiers[0].avg_completion_milliseconds)}</span>
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFeesExpanded(true)}
                                className="flex items-center justify-between w-full hover:text-primary-text transition-colors border-t border-secondary-400/40 pt-2 mt-0.5 rounded-t-none"
                                aria-label="Show fee for larger sends"
                            >
                                <span>{`${formatFee(sortedTiers[1].total_percentage_fee, sortedTiers[1].total_fixed_fee_in_usd)} for larger sends`}</span>
                                <ChevronDown className="h-4 w-4 shrink-0" />
                            </button>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
};

type DepositAddressFormButtonProps = {
    values: SwapFormValues;
    isValid: boolean;
    error: string;
    isSubmitting: boolean;
    showDepositInfo: boolean;
    depositAddress: string | undefined;
    isProcessing: boolean;
    isCompleted: boolean;
    onDepositMore: () => void;
}

const DepositAddressFormButton: FC<DepositAddressFormButtonProps> = ({
    values, isValid, error, isSubmitting, showDepositInfo, depositAddress, isProcessing, isCompleted, onDepositMore,
}) => {
    const [copied, copy] = useCopyClipboard();

    if (isCompleted) {
        return (
            <SubmitButton type="button" onClick={onDepositMore}>
                Deposit more
            </SubmitButton>
        );
    }

    if (isProcessing) {
        return null;
    }

    if (showDepositInfo && depositAddress) {
        return (
            <SubmitButton type="button" onClick={() => copy(depositAddress)}>
                {copied ? 'Copied!' : 'Copy deposit address'}
            </SubmitButton>
        );
    }

    const waitingForAddress = !values?.destination_address;
    const label = error
        || (waitingForAddress ? 'Enter destination address' : 'Generating deposit address');

    return (
        <SubmitButton
            type="button"
            isDisabled
            isSubmitting={!waitingForAddress && isValid && !error && isSubmitting}
        >
            {label}
        </SubmitButton>
    );
};

// ---------- helpers ----------

function formatCompletionTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `~${hours}h`;
    if (minutes > 0) return `~${minutes} min`;
    return `~${seconds}s`;
}

function formatFee(percentageFee: number, fixedFeeUsd: number): string {
    const parts: string[] = [];
    const pct = formatPercent(percentageFee);
    if (pct) parts.push(pct);
    if (fixedFeeUsd > 0) parts.push(formatUsd(fixedFeeUsd));
    return parts.join(' + ') || 'Free';
}

function formatTokenAmount(value: number): string {
    if (!Number.isFinite(value)) return '';
    if (value === 0) return '0';
    let maximumFractionDigits: number;
    if (value >= 1000) maximumFractionDigits = 0;
    else if (value >= 10) maximumFractionDigits = 2;
    else if (value >= 1) maximumFractionDigits = 4;
    else maximumFractionDigits = 6;
    return value.toLocaleString('en-US', { maximumFractionDigits });
}

function formatTierRange(tier: DetailedQuoteModel, isFirst: boolean, isLast: boolean, symbol: string): string {
    const min = formatTokenAmount(tier.min_amount);
    const max = formatTokenAmount(tier.max_amount);
    if (isFirst) return `Up to ${max} ${symbol}`;
    if (isLast) return `Over ${min} ${symbol}`;
    return `${min} – ${max} ${symbol}`;
}

function resolveDepositAddress(
    network: { type?: string } | undefined,
    depositActions: DepositAction[] | undefined
): string | undefined {
    if (!depositActions || depositActions.length === 0) return undefined;
    if (!network) return depositActions[0].to_address;
    const match = depositActions.find(a => a.network?.type === network.type);
    return match?.to_address ?? depositActions[0].to_address;
}

// Shares the same SWR key as `useAutoSourceRoute` so both callers reuse one cached request.
function useDepositAddressAvailableRoutes(destinationNetwork: string | undefined, destinationToken: string | undefined) {
    const { data } = useDepositAddressSources({ destinationNetwork, destinationToken });
    const availableRoutes: NetworkRoute[] = useMemo(() => {
        const routes = data?.data;
        if (!routes) return [];
        return routes
            .map(route => ({ ...route, tokens: route.tokens?.filter(t => t.status === 'active') ?? [] }))
            .filter(route => route.tokens.length > 0);
    }, [data]);
    return { availableRoutes };
}
