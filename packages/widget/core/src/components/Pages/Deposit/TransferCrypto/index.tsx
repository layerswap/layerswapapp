import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useFormikContext, type FormikHelpers } from "formik";
import { Partner } from "@/Models/Partner";
import SwapForm from "@/components/Pages/Swap/Form/SwapForm";
import DepositAddressForm from "@/components/Pages/Swap/Form/DepositAddressForm";
import ReceivePicker from "@/components/Pages/Swap/Form/DepositAddressForm/ReceivePicker";
import { ValidationProvider } from "@/context/validationContext";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings } from "@/context/settings";
import { type ApiError, LSAPIKnownErrorCode } from "@layerswap/widget-types";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { useDepositInitialValues, useDepositSelection } from "../depositSelectionContext";
import { useDepositPrefetch } from "../depositPrefetchContext";
import { useReportCloseLock } from "../depositStepContext";
import { useResolvedSwapStatus } from "@/hooks/useResolvedSwapStatus";
import { SwapResponse, TransactionType } from "@/lib/apiClients/layerSwapApiClient";
import { Address } from "@/lib/address/Address";
import { requireRefundAddress } from "@/helpers/refundAddress";

type Props = {
    partner?: Partner;
    /** Render the destination token picker above the form. Needed when this step
     * is the flow root (no method picker), since the picker normally lives there.
     * It self-hides when there is a single supported destination. */
    showDestinationPicker?: boolean;
};

const PinDestinationAddress: FC<{ destinationAddress: string }> = ({ destinationAddress }) => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    useEffect(() => {
        if (values?.destination_address === destinationAddress) return;
        setFieldValue("destination_address", destinationAddress, true);
    }, [destinationAddress, values?.destination_address, setFieldValue]);
    return null;
};

const ReportDepositCloseLock: FC = () => {
    const { swapDetails } = useSwapDataState();
    const { isTerminal } = useResolvedSwapStatus();
    const inputDetected = !!swapDetails?.transactions?.some(t => t.type === TransactionType.Input);
    useReportCloseLock(inputDetected && !isTerminal);
    return null;
};

/**
 * The "Receive" row for the no-method-picker deposit flow. Reuses the default
 * form's ReceivePicker but constrains its options to the integrator's resolved
 * destinations and drops the recipient wallet picker (the address is locked).
 * Selecting a token keeps both the shared selection context and Formik in sync.
 */
const DepositDestinationRow: FC = () => {
    const { resolved, destination, destinationToken, setSelection } = useDepositSelection();
    const { setFieldValue } = useFormikContext<SwapFormValues>();

    // One route on the integrator's fixed network, carrying its allowed tokens.
    // Falls back to the active selection if the integrator pairs didn't resolve.
    const routes = useMemo<NetworkRoute[]>(() => {
        const pairs = resolved.length > 0
            ? resolved
            : (destination && destinationToken ? [{ network: destination, token: destinationToken }] : []);
        if (pairs.length === 0) return [];
        return [{ ...pairs[0].network, tokens: pairs.map(p => p.token) }];
    }, [resolved, destination, destinationToken]);

    const handleChange = useCallback((network: NetworkRoute, token: NetworkRouteToken) => {
        setSelection(network, token);
        setFieldValue('to', network, false);
        setFieldValue('toAsset', token, true);
    }, [setSelection, setFieldValue]);

    return (
        <ReceivePicker
            selectedDestination={destination && destinationToken ? { network: destination, token: destinationToken } : null}
            onDestinationChange={handleChange}
            destinationAddress={undefined}
            destination={destination}
            routes={routes}
            hideWalletPicker
        />
    );
};

function withPrefetchedRefund(values: SwapFormValues, response?: SwapResponse): SwapFormValues {
    const swap = response?.swap;
    // Inherit only an accepted recipient for this route, preserving explicit edits
    // and ignoring responses that arrived after the user changed their selection.
    if (!swap?.refund_address || values.refund_address
        || !swap.use_deposit_address || values.depositMethod !== 'deposit_address'
        || swap.source_network.name !== values.from?.name
        || swap.source_token.symbol !== values.fromAsset?.symbol
        || swap.destination_network.name !== values.to?.name
        || swap.destination_token.symbol !== values.toAsset?.symbol
        || !values.destination_address
        || !Address.equals(swap.destination_address, values.destination_address, swap.destination_network)) {
        return values;
    }
    return {
        ...values,
        refund_address: swap.refund_address,
        refundAddressNetwork: swap.source_network.name,
    };
}

const DepositAddressFlow: FC<Props & { initialSwapData?: SwapResponse }> = ({ partner, showDestinationPicker, initialSwapData }) => {
    const initialSettings = useInitialSettings();
    const { destinationAddress } = useDepositSelection();
    const { prefetchedSource, claimPrefetchedSwap, markSwapUsed } = useDepositPrefetch();
    const generatedInitialValues = useDepositInitialValues("deposit_address", prefetchedSource);
    const initialValues = useMemo(() => withPrefetchedRefund(generatedInitialValues, initialSwapData), [generatedInitialValues, initialSwapData]);
    const { createSwap, setSwapId, setSubmitedFormValues, rememberRefundAddress } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    // The seeded swap came from the prefetcher — report it as used so the
    // integrator's onSwapCreate fires and "Deposit more" creates a fresh one.
    // DepositAddressForm never auto-submits while a swap id is set, so the
    // prefetch provider synthesizes form_submitted for this hand-over.
    useEffect(() => {
        if (initialSwapData) markSwapUsed(initialSwapData);
    }, []);

    const handleSubmit = useCallback(
        async (values: SwapFormValues, helpers: FormikHelpers<SwapFormValues>) => {
            // Triggered by DepositAddressForm's auto-submit effect once the form
            // is valid. The wallet flow never reaches here — it has its own
            // provider and persists via setSubmitedFormValues/setSwapId.
            if (setSwapError) setSwapError("");
            setSubmitedFormValues(values);
            try {
                // A prefetched (possibly still in-flight) swap for these exact
                // values takes priority; on its failure fall back to a regular
                // creation so the user still gets a swap and a real error path.
                let swap = await claimPrefetchedSwap(values)?.catch(() => undefined);
                if (swap) {
                    const acceptedSwap = swap;
                    const hydratedValues = withPrefetchedRefund(values, acceptedSwap);
                    if (hydratedValues !== values) {
                        values = hydratedValues;
                        await helpers.setValues(current => withPrefetchedRefund(current, acceptedSwap), false);
                        setSubmitedFormValues(values);
                    }
                } else {
                    swap = await createSwap(values, initialSettings, partner);
                }
                rememberRefundAddress(swap);
                markSwapUsed(swap, values);
                setSwapId(swap.swap.id);
            } catch (error) {
                const data: ApiError | undefined = error?.response?.data?.error ?? error;
                let message: string;
                if (data?.code === 'REFUND_ADDRESS_MISSING') {
                    await helpers.setValues(current => requireRefundAddress(current, values), false);
                    message = 'Enter a refund address to continue.';
                } else if (data?.code === LSAPIKnownErrorCode.BLACKLISTED_ADDRESS) {
                    message = "You can't transfer to that address. Please double check.";
                } else if (data?.code === LSAPIKnownErrorCode.INVALID_ADDRESS_ERROR) {
                    message = `Enter a valid ${values.to?.display_name} address`;
                } else {
                    message = data?.message || error?.message || "Could not create swap";
                }
                if (setSwapError) setSwapError(message);
            }
        },
        [createSwap, setSwapId, setSubmitedFormValues, rememberRefundAddress, setSwapError, initialSettings, partner, claimPrefetchedSwap, markSwapUsed],
    );

    return (
        // Auto-submit (DepositAddressForm) goes through Formik submit, so SwapForm
        // emits form_submitted per creation attempt, including after "Deposit more".
        <SwapForm mode="deposit-widget-address" submitPath="DepositAddressFlow" submitAction="auto" initialValues={initialValues} validateOnMount onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3">
                <PinDestinationAddress destinationAddress={destinationAddress} />
                <ReportDepositCloseLock />
                <ValidationProvider>
                    <DepositAddressForm
                        partner={partner}
                        disableAutoConnect
                        hideDestinationPicker={!showDestinationPicker}
                        destinationPicker={showDestinationPicker ? <DepositDestinationRow /> : undefined}
                        lockDestinationAddress
                        hideEasyDepositBanner
                        hidePoweredBy
                    />
                </ValidationProvider>
            </div>
        </SwapForm>
    );
};

const TransferCrypto: FC<Props> = ({ partner, showDestinationPicker }) => {
    const { prefetchedSwap } = useDepositPrefetch();
    const [initialSwapData] = useState(() => prefetchedSwap);
    return (
        <SwapDataProvider initialSwapData={initialSwapData}>
            <DepositAddressFlow partner={partner} showDestinationPicker={showDestinationPicker} initialSwapData={initialSwapData} />
        </SwapDataProvider>
    );
};

export default TransferCrypto;
