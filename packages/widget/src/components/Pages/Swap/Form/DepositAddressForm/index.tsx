import { FC, useEffect, useMemo, useRef } from "react";
import { Form, useFormikContext } from "formik";
import { Loader2 } from "lucide-react";
import { Widget } from "@/components/Widget/Index";
import { Partner } from "@/Models/Partner";
import { useValidationContext } from "@/context/validationContext";
import useWallet from "@/hooks/useWallet";
import { SwapStatus } from "@/Models/SwapStatus";
import { Address as AddressClass } from "@/lib/address/Address";
import useAutoSourceRoute from "@/hooks/useAutoSourceRoute";
import { useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings, useSettingsState } from "@/context/settings";
import { useSelectedAccount } from "@/context/swapAccounts";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { TransactionType } from "@/lib/apiClients/layerSwapApiClient";
import EasyDepositBanner from "./EasyDepositBanner";
import PayFromPicker from "./PayFromPicker";
import ReceivePicker from "./ReceivePicker";
import DepositAddressInfo from "./DepositAddressInfo";
import DepositAddressFormButton from "./DepositAddressFormButton";
import { resolveDepositAddress } from "@/helpers/depositActions";
import { SwapFormValues } from "../SwapFormValues";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import Processing from "../../Withdraw/Processing";
import ValidationError from "../SecondaryComponents/validationError";
import SwapError from "../SecondaryComponents/SwapError";

type Props = {
    partner?: Partner;
    /** When true, do not open the wallet-connect modal on mount if no wallet
     * is connected. Used when the caller has already gated the entry on a
     * connected wallet (e.g. the Deposit widget's method picker). */
    disableAutoConnect?: boolean;
    /** When true, do not render the destination picker. Caller is responsible
     * for setting `to` / `toAsset` Formik values before mount (e.g. via
     * `lockTo`/`lockToAsset` initial settings or its own picker UI). */
    hideDestinationPicker?: boolean;
    /** When true, skip the wallet → destination_address autofill. The caller
     * owns Formik's `destination_address` and any autofill from the connected
     * wallet would just stomp on it. */
    lockDestinationAddress?: boolean;
    /** When true, hide the "Easy deposit in 3 steps" instructional banner.
     * Used by the deposit widget where the parent provides its own context. */
    hideEasyDepositBanner?: boolean;
};

const DepositAddressForm: FC<Props> = ({ disableAutoConnect, hideDestinationPicker, lockDestinationAddress, hideEasyDepositBanner }) => {
    const {
        values, isSubmitting, setFieldValue, submitForm
    } = useFormikContext<SwapFormValues>();

    const { to: destination, destination_address, toAsset: toCurrency, from, fromAsset } = values || {};

    const { isAutoSourceUpdating } = useAutoSourceRoute();

    const { wallets, providers } = useWallet();
    const hasWallet = wallets.length > 0;
    // Each provider exposes a `ready` flag that flips true once its connectors
    // have hydrated (e.g. wagmi finishes auto-reconnect, starknet enumerates
    // injected wallets, solana wallet-adapter populates). Until every provider
    // is ready, `wallets` may be empty even though a persisted wallet is about
    // to appear — opening the connect modal in that window would just slide it
    // back out a moment later.
    const providersReady = providers.every(p => p.ready);
    const { connect, isWalletModalOpen, cancel } = useConnectModal();
    const settings = useSettingsState();
    const initialSettings = useInitialSettings();

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
        if (disableAutoConnect) return;
        if (hasWallet) return;
        if (isWalletModalOpenRef.current) return;
        connect(undefined, { dismissible: false, topContent: <EasyDepositBanner variant="modal" currentStepIndex={0} />, fullHeight: true, hideHeader: true });
        return () => { cancel(); };
    }, [hasWallet, connect, cancel, disableAutoConnect]);

    // Apply default destination/source when a wallet is present and the form
    // is still blank. `generateSwapInitialValues` is the same helper used by
    // Formik's initialValues, so the deposit-address flow lands on the same
    // defaults whether the wallet was present from mount or connected later.
    useEffect(() => {
        if (!hasWallet || destination) return;
        const defaults = generateSwapInitialValues(settings, initialSettings, 'deposit-address', connectedAutofillNetworks);
        if (!defaults.to || !defaults.toAsset) return;
        setFieldValue('to', defaults.to, false);
        setFieldValue('toAsset', defaults.toAsset, true);
    }, [hasWallet, destination, settings, initialSettings, connectedAutofillNetworks, setFieldValue]);

    // Auto-fill `destination_address` from the current default wallet account
    // for the chosen destination. The picker can override this by calling
    // `selectDestinationAccount`, which updates `destinationAccount` and feeds
    // back through this effect (so the picker's choice wins). Manually-added
    // addresses (carried over from other flows via `selectedDestAccounts`) are
    // intentionally ignored here — this flow expects a connected wallet.
    const rawDestinationAccount = useSelectedAccount("to", destination?.name);
    const destinationAccount = rawDestinationAccount?.id === 'manually_added' ? undefined : rawDestinationAccount;
    useEffect(() => {
        if (lockDestinationAddress) return;
        if (!destination) return;
        const next = destinationAccount?.address ?? '';
        if ((destination_address ?? '').toLowerCase() === next.toLowerCase()) return;
        setFieldValue('destination_address', next, true);
    }, [lockDestinationAddress, destination?.name, destinationAccount?.address, destination_address, setFieldValue]);

    useEffect(() => {
        setFieldValue('depositMethod', 'deposit_address', true)
    }, [])

    const { formValidation } = useValidationContext();
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
            AddressClass.equals(swapBasicData.destination_address ?? '', destination_address ?? '', destination)
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
    // attempted (from, fromAsset, to, toAsset, address) tuple so we don't loop:
    // if the just-created swap is then dropped by the stale-swap effect (e.g.
    // because the API echoes the address in a different canonical form), the
    // same key must not be auto-resubmitted. Cleared by explicit user actions
    // like "Deposit more", and whenever the form drops to incomplete (e.g.
    // wallet disconnects) so reconnecting the same wallet re-creates the swap.
    const attemptedKeyRef = useRef<string | null>(null);
    const fieldKey = allFieldsReady
        ? `${from?.name}|${fromAsset?.symbol}|${destination?.name}|${toCurrency?.symbol}|${destination_address?.toLowerCase()}`
        : null;

    useEffect(() => {
        if (!fieldKey) {
            attemptedKeyRef.current = null;
            return;
        }
        if (swapId || isSubmitting || !isValid) return;
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
    // transaction exists (resolveSwapPhase's `outputReady`: a hash + amount) —
    // even before the output tx status string flips to "completed". Mirror that
    // exact signal here so the "Deposit more" button appears at the same moment
    // the panel shows the deposit as done, instead of waiting for a status the
    // panel never gates on.
    const outputTx = swapDetails?.transactions?.find(t => t.type === TransactionType.Output);
    const hasOutputTx = !!(outputTx?.transaction_hash && outputTx?.amount);
    const isCompleted = !!swapId && swapMatchesValues && hasOutputTx;
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
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full gap-3">
                {isProcessing ? (
                    <Processing />
                ) : (
                    <Widget.Content>
                        <div className="w-full flex flex-col justify-between flex-1 relative min-h-60">
                            <div className="flex flex-col w-full gap-3">

                                {!hideEasyDepositBanner && <EasyDepositBanner />}

                                {!disableAutoConnect && !providersReady && !hasWallet ? (
                                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-secondary-text">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Loading wallets…</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Source (Pay from) */}
                                        <PayFromPicker
                                            selectedSource={from && fromAsset ? { network: from, token: fromAsset } : null}
                                            onSourceChange={(network, token) => {
                                                const isSameSource = from?.name === network.name && fromAsset?.symbol === token.symbol;
                                                if (isSameSource) {
                                                    if (!swapId) attemptedKeyRef.current = null;
                                                    return;
                                                }
                                                setSwapId(undefined);
                                                setFieldValue('from', network, false);
                                                setFieldValue('fromAsset', token, true);
                                            }}
                                            destinationNetwork={destination?.name}
                                            destinationToken={toCurrency?.symbol}
                                            hideDestinationPicker={hideDestinationPicker}
                                        />

                                        {/* Destination network/token + recipient address share one "Receive" row */}
                                        {!hideDestinationPicker && (
                                            <ReceivePicker
                                                selectedDestination={destination && toCurrency ? { network: destination, token: toCurrency } : null}
                                                onDestinationChange={(network, token) => {
                                                    setSwapId(undefined);
                                                    setFieldValue('to', network, false);
                                                    setFieldValue('toAsset', token, true);
                                                }}
                                                destinationAddress={destination_address}
                                                destination={destination}
                                            />
                                        )}

                                        {/* Deposit address + QR + fees. When the destination
                                            address is integrator-locked, render this in skeleton
                                            mode while the swap is being created so the user sees
                                            the eventual layout instead of a blank gap. */}
                                        {(showDepositInfo || lockDestinationAddress) && (
                                            <DepositAddressInfo
                                                sourceNetwork={from}
                                                sourceToken={fromAsset}
                                                destinationNetwork={destination}
                                                destinationToken={toCurrency}
                                                destinationAddress={destination_address}
                                                refuel={!!refuel || !!swapBasicData?.refuel}
                                                depositAddress={depositAddress}
                                                isCreatingSwap={!showDepositInfo}
                                            />
                                        )}
                                    </>
                                )}
                                <ValidationError />
                                <SwapError />
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
