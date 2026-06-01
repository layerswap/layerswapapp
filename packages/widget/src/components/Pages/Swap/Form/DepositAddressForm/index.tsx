import { FC, Suspense, lazy, useEffect, useMemo, useRef } from "react";
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
// `Processing` is the post-deposit progress UI. It only renders when the
// user has already submitted a swap and is mid-flow — on first paint of
// `/` it is always inactive. Lazy-loading keeps the Withdraw component
// graph (transferProcessing, multi-step wallet UI, etc.) out of the home
// page's entry chunks.
const Processing = lazy(() => import(/* webpackChunkName: "swap-processing" */ "../../Withdraw/Processing"))
import ValidationError from "../SecondaryComponents/validationError";

type Props = {
    partner?: Partner;
};

const DepositAddressForm: FC<Props> = () => {
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
    // back out a moment later. Descriptor stubs are intentionally `ready: false`
    // until their bundle loads on demand, so they're excluded here — otherwise
    // an unloaded stub would keep this gate false forever and deadlock the form.
    const providersReady = providers.every(p => p.isStub || (typeof p.ready === 'boolean' ? p.ready : true));
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
        if (!providersReady) return;
        if (hasWallet) return;
        if (isWalletModalOpenRef.current) return;
        connect(undefined, { dismissible: false, topContent: <EasyDepositBanner variant="modal" currentStepIndex={0} />, fullHeight: true, hideHeader: true });
        return () => { cancel(); };
    }, [providersReady, hasWallet, connect, cancel]);

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
        if (!destination) return;
        const next = destinationAccount?.address ?? '';
        if ((destination_address ?? '').toLowerCase() === next.toLowerCase()) return;
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
    // transaction exists, even before swapStatus flips to Completed. Mirror
    // that here so the "Deposit more" button appears at the same time.
    const hasOutputTx = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Output);
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
            <Form className="h-full grow flex flex-col flex-1 justify-between w-full gap-2">
                {isProcessing ? (
                    <Suspense fallback={null}>
                        <Processing />
                    </Suspense>
                ) : (
                    <Widget.Content>
                        <div className="w-full flex flex-col justify-between flex-1 relative min-h-60">
                            <div className="flex flex-col w-full gap-2">

                                <EasyDepositBanner />

                                {!providersReady && !hasWallet ? (
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
                                                setSwapId(undefined);
                                                setFieldValue('from', network, false);
                                                setFieldValue('fromAsset', token, true);
                                            }}
                                            destinationNetwork={destination?.name}
                                            destinationToken={toCurrency?.symbol}
                                        />

                                        {/* Destination network/token + recipient address share one "Receive" row */}
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
                                    </>
                                )}

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
