import { FormSourceWalletButton } from "@/components/Input/SourceWalletPicker";
import SubmitButton from "@/components/Buttons/submitButton";
import { useInitialSettings } from "@/context/settings";
import { useSwapDataState } from "@/context/swap";
import Address from "@/components/Input/Address";
import { SwapFormValues } from "../SwapFormValues";
import { Partner } from "@/Models/Partner";
import SwapError from "./SwapError";

type Props = {
    shouldConnectWallet: boolean,
    values: SwapFormValues,
    disabled: boolean,
    error: string,
    isSubmitting: boolean,
    isQuoteLoading?: boolean,
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
    const initialSettings = useInitialSettings();
    const { swapError } = useSwapDataState();
    const actionDisplayName = error || initialSettings?.actionButtonText || "Next";
    const preSubmitDisabled = isSubmitting || isQuoteLoading;

    const button = (() => {
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
    })();

    return (
        <div className="flex flex-col gap-2 w-full">
            {swapError ? <SwapError /> : null}
            {button}
        </div>
    );
};

export default FormButton;