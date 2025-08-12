import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import SwapButton from "../buttons/swapButton";
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
    const actionDisplayName = error || query?.actionButtonText || "Swap now";

    if (shouldConnectWallet) {
        return <FormSourceWalletButton />;
    }

    if (values?.to && !values?.destination_address) {
        return (
            <Address partner={partner}>
                {() => (
                    <SubmitButton type="button" className="w-full">
                        <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                            <PlusIcon className="stroke-1" />
                        </span>
                        <span className="grow text-center">Enter destination address</span>
                    </SubmitButton>
                )}
            </Address>
        );
    }

    return (
        <SwapButton
            className="plausible-event-name=Swap+initiated"
            type="submit"
            isDisabled={!isValid}
            isSubmitting={isSubmitting}
        >
            {actionDisplayName}
        </SwapButton>
    );
};

export default FormButton;