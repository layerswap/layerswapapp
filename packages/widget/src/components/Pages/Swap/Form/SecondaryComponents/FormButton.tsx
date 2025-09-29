import { FormSourceWalletButton } from "../../../../Input/SourceWalletPicker";
import SubmitButton from "../../../../Buttons/submitButton";
import { useInitialSettings } from "@/context/settings";
import Address from "../../../../Input/Address";
import { SwapFormValues } from "../SwapFormValues";
import { Partner } from "@/Models/Partner";
import AppSettings from "@/lib/AppSettings";

type Props = {
    shouldConnectWallet: boolean,
    values: SwapFormValues,
    disabled: boolean,
    error: string,
    isSubmitting: boolean,
    partner: Partner | undefined,
}

const FormButton = ({
    shouldConnectWallet,
    values,
    disabled,
    error,
    isSubmitting,
    partner,
}: Props) => {
    const initialSettings = useInitialSettings();
    const actionDisplayName = error || AppSettings.ActionButtonDisplayText || initialSettings?.actionButtonText || "Next";
    if (shouldConnectWallet && !error) {
        return <FormSourceWalletButton />;
    }

    if (values?.to && !values?.destination_address && !error) {
        return (
            <Address partner={partner}>
                {() => (
                    <SubmitButton type="button" className="w-full">
                        <span className="grow text-center">Enter destination address</span>
                    </SubmitButton>
                )}
            </Address>
        );
    }

    return (
        <SubmitButton
            className="plausible-event-name=Swap+initiated"
            type="submit"
            isDisabled={disabled}
            isSubmitting={isSubmitting}
        >
            {actionDisplayName}
        </SubmitButton>
    );
};

export default FormButton;