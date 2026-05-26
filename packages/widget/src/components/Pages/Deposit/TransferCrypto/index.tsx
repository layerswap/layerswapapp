import { FC } from "react";
import { Partner } from "@/Models/Partner";
import DepositAddressForm from "@/components/Pages/Swap/Form/DepositAddressForm";
import { ValidationProvider } from "@/context/validationContext";
import { useInitialSettings } from "@/context/settings";

type Props = {
    partner?: Partner;
};

/**
 * Wrapper that reuses the existing DepositAddressForm for the "Transfer Crypto"
 * sub-flow. We disable its auto wallet-connect-on-mount because the user has
 * already chosen this method from the parent picker (and may not have a wallet
 * connected at all — that's fine here, manual transfer doesn't require one).
 * When the destination is locked by integrator settings, we also hide the
 * internal destination picker since the outer Deposit header already owns it.
 */
const TransferCrypto: FC<Props> = ({ partner }) => {
    const initialSettings = useInitialSettings();
    const destinationLocked = !!initialSettings.lockTo && !!initialSettings.lockToAsset;

    return (
        <ValidationProvider>
            <DepositAddressForm
                partner={partner}
                disableAutoConnect
                hideDestinationPicker={destinationLocked}
            />
        </ValidationProvider>
    );
};

export default TransferCrypto;
