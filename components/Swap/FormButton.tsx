import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import SubmitButton from "../buttons/submitButton";
import { useQueryState } from "@/context/query";
import Address from "../Input/Address";


const FormButton = ({
    shouldConnectWallet,
    values,
    isValid,
    error,
    isSubmitting,
    partner,
}) => {
    const query = useQueryState();
    const actionDisplayName = error || query?.actionButtonText || "Next";

    if (shouldConnectWallet) {
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
            isDisabled={!isValid}
            isSubmitting={isSubmitting}
        >
            {actionDisplayName}
        </SubmitButton>
    );
};

export default FormButton;