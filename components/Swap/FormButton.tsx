import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import SubmitButton from "../buttons/submitButton";
import { useQueryState } from "@/context/query";
import Address from "../Input/Address";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { Partner } from "@/Models/Partner";

type Props = {
    shouldConnectWallet: boolean,
    values: SwapFormValues,
    disabled: boolean,
    error: string,
    isSubmitting: boolean,
    isQuoteLoading: boolean,
    partner: Partner | undefined,
}

const FormButton = ({
    shouldConnectWallet,
    values,
    disabled,
    error,
    isSubmitting,
    isQuoteLoading,
    partner,
}: Props) => {
    const query = useQueryState();
    const actionDisplayName = error || query?.actionButtonText || "Next";
    const preSubmitDisabled = isSubmitting || isQuoteLoading;

    if (shouldConnectWallet && (!error || !values.to || !values.amount)) {
        return <FormSourceWalletButton isDisabled={preSubmitDisabled} />;
    }

    if (values?.to && !values?.destination_address && !error) {
        return (
            <Address partner={partner}>
                {() => (
                    <SubmitButton type="button" className="w-full" isDisabled={preSubmitDisabled}>
                        <span className="grow text-center">Enter destination address</span>
                    </SubmitButton>
                )}
            </Address>
        );
    }

    return (
        <SubmitButton
            data-attr="submit-swap"
            type="submit"
            isDisabled={disabled}
            isSubmitting={isSubmitting}
        >
            {actionDisplayName}
        </SubmitButton>
    );
};

export default FormButton;