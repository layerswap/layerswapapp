import { FC, useCallback, useEffect } from "react";
import { Formik, useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import DepositAddressForm from "@/components/Pages/Swap/Form/DepositAddressForm";
import { ValidationProvider } from "@/context/validationContext";
import { SwapDataProvider, useSwapDataState, useSwapDataUpdate } from "@/context/swap";
import { useInitialSettings } from "@/context/settings";
import { ApiError, LSAPIKnownErrorCode } from "@/Models/ApiError";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";
import { useDepositInitialValues, useDepositSelection } from "../depositSelectionContext";

type Props = {
    partner?: Partner;
};

/**
 * Keeps Formik's destination_address pinned to the integrator value in case
 * anything inside the form attempts to clear it (e.g. transient state during a
 * destination switch). Rendered inside this flow's own Formik so the context
 * resolves to the deposit-address form provider.
 */
const PinDestinationAddress: FC<{ destinationAddress: string }> = ({ destinationAddress }) => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();
    useEffect(() => {
        if (values?.destination_address === destinationAddress) return;
        setFieldValue("destination_address", destinationAddress, true);
    }, [destinationAddress, values?.destination_address, setFieldValue]);
    return null;
};

const DepositAddressFlow: FC<Props> = ({ partner }) => {
    const initialSettings = useInitialSettings();
    const { destinationAddress } = useDepositSelection();
    const initialValues = useDepositInitialValues("deposit_address");
    const { createSwap, setSwapId, setSubmitedFormValues } = useSwapDataUpdate();
    const { setSwapError } = useSwapDataState();

    const handleSubmit = useCallback(
        async (values: SwapFormValues) => {
            // Triggered by DepositAddressForm's auto-submit effect once the form
            // is valid. The wallet flow never reaches here — it has its own
            // provider and persists via setSubmitedFormValues/setSwapId.
            if (setSwapError) setSwapError("");
            setSubmitedFormValues(values);
            try {
                const swap = await createSwap(values, initialSettings, partner);
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
        [createSwap, setSwapId, setSubmitedFormValues, setSwapError, initialSettings, partner],
    );

    return (
        <Formik initialValues={initialValues} validateOnMount onSubmit={handleSubmit}>
            {/* Formik calls React.Children.only on JSX children — keep a single
                wrapping element. */}
            <>
                <PinDestinationAddress destinationAddress={destinationAddress} />
                <ValidationProvider>
                    <DepositAddressForm
                        partner={partner}
                        disableAutoConnect
                        hideDestinationPicker
                        lockDestinationAddress
                        hideEasyDepositBanner
                    />
                </ValidationProvider>
            </>
        </Formik>
    );
};

/**
 * Wrapper that reuses the existing DepositAddressForm for the "Transfer Crypto"
 * sub-flow. It owns its own SwapDataProvider + Formik so its swap lifecycle and
 * form state are isolated from the wallet flow (mirrors the per-tab separation
 * in the main swap flow). We disable auto wallet-connect-on-mount because the
 * user already chose this method from the parent picker (and may not have a
 * wallet at all — manual transfer doesn't require one). The integrator always
 * supplies the destination address, so the internal picker stays hidden and the
 * address autofill is locked.
 */
const TransferCrypto: FC<Props> = ({ partner }) => (
    <SwapDataProvider>
        <DepositAddressFlow partner={partner} />
    </SwapDataProvider>
);

export default TransferCrypto;
