import { FC, useEffect } from "react";
import { useFormikContext } from "formik";
import { Partner } from "@/Models/Partner";
import DepositAddressForm from "@/components/Pages/Swap/Form/DepositAddressForm";
import { ValidationProvider } from "@/context/validationContext";
import { SwapFormValues } from "@/components/Pages/Swap/Form/SwapFormValues";

type Props = {
    partner?: Partner;
    /** Integrator-provided recipient address — pinned for the entire deposit
     * flow. We push it back into Formik here so DepositAddressForm's internal
     * wallet autofill doesn't overwrite it after this step mounts. */
    destinationAddress: string;
};

/**
 * Wrapper that reuses the existing DepositAddressForm for the "Transfer Crypto"
 * sub-flow. We disable its auto wallet-connect-on-mount because the user has
 * already chosen this method from the parent picker (and may not have a wallet
 * connected at all — manual transfer doesn't require one). The integrator
 * always supplies the destination address, so the internal destination picker
 * stays hidden and the address autofill is locked.
 */
const TransferCrypto: FC<Props> = ({ partner, destinationAddress }) => {
    const { values, setFieldValue } = useFormikContext<SwapFormValues>();

    // Keep Formik's destination_address pinned to the integrator value in
    // case anything inside the form attempts to clear it (e.g. transient state
    // during a destination switch).
    useEffect(() => {
        if (values?.destination_address === destinationAddress) return;
        setFieldValue("destination_address", destinationAddress, true);
    }, [destinationAddress, values?.destination_address, setFieldValue]);

    return (
        <ValidationProvider>
            <DepositAddressForm
                partner={partner}
                disableAutoConnect
                hideDestinationPicker
                lockDestinationAddress
                hideEasyDepositBanner
            />
        </ValidationProvider>
    );
};

export default TransferCrypto;
