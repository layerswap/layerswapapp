import { FC, useCallback, useEffect, useState } from "react";
import { Formik, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import DepositAddressForm from "@/components/Pages/Swap/Form/DepositAddressForm";
import { ValidationProvider } from "@/context/validationContext";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings } from "@/context/settings";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useDepositInitialValues, useDepositSelection } from "../depositSelectionContext";
import { useDepositPrefetch } from "../depositPrefetchContext";
import { useReportCloseLock } from "../depositStepContext";
import DestinationTokenPicker from "../DestinationTokenPicker";
import { useResolvedSwapStatus } from "@/hooks/useResolvedSwapStatus";
import { SwapResponse, TransactionType } from "@/lib/apiClients/layerSwapApiClient";

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

const DepositAddressFlow: FC<Props & { initialSwapData?: SwapResponse }> = ({ partner, showDestinationPicker, initialSwapData }) => {
    const initialSettings = useInitialSettings();
    const { destinationAddress } = useDepositSelection();
    const { prefetchedSource, claimPrefetchedSwap, markSwapUsed } = useDepositPrefetch();
    const initialValues = useDepositInitialValues("deposit_address", prefetchedSource);
    const { createSwap, setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    // The seeded swap came from the prefetcher — report it as used so the
    // integrator's onSwapCreate fires and "Deposit more" creates a fresh one.
    useEffect(() => {
        if (initialSwapData) markSwapUsed(initialSwapData);
    }, []);

    const handleSubmit = useCallback(
        async (values: SwapFormValues) => {
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
                if (!swap) swap = await createSwap(values, initialSettings, partner);
                markSwapUsed(swap, values);
                setSwapId(swap.swap.id);
            } catch (error) {
                const data: ApiError = error?.response?.data?.error;
                let message: string;
                if (data?.code === LSAPIKnownErrorCode.BLACKLISTED_ADDRESS) {
                    message = "You can't transfer to that address. Please double check.";
                } else if (data?.code === LSAPIKnownErrorCode.INVALID_ADDRESS_ERROR) {
                    message = `Enter a valid ${values.to?.display_name} address`;
                } else {
                    message = data?.message || error?.message || "Could not create swap";
                }
                if (setSwapError) setSwapError(message);
            }
        },
        [createSwap, setSwapId, setSubmitedFormValues, setSwapError, initialSettings, partner, claimPrefetchedSwap, markSwapUsed],
    );

    return (
        <Formik initialValues={initialValues} validateOnMount onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3">
                {showDestinationPicker && <DestinationTokenPicker />}
                <PinDestinationAddress destinationAddress={destinationAddress} />
                <ReportDepositCloseLock />
                <ValidationProvider>
                    <DepositAddressForm
                        partner={partner}
                        disableAutoConnect
                        hideDestinationPicker
                        lockDestinationAddress
                        hideEasyDepositBanner
                    />
                </ValidationProvider>
            </div>
        </Formik>
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
