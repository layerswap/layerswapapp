import dynamic from "next/dynamic";
import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import SwapButton from "../buttons/swapButton";
import { FormikErrors } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import SubmitButton from "../buttons/submitButton";
import { useQueryState } from "@/context/query";

const Address = dynamic(() => import("../Input/Address"), {
    loading: () => <></>,
});

const FormButton = ({
    shouldConnectWallet,
    values,
    isValid,
    errors,
    isSubmitting,
    partner,
}) => {
    const query = useQueryState();
    const actionDisplayName = query?.actionButtonText || "Swap now";

    if (shouldConnectWallet) {
        return <FormSourceWalletButton />;
    }

    if (values?.to && !values?.destination_address) {
        return (
            <Address partner={partner}>
                {() => (
                    <SubmitButton className="w-full">
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
            {ActionText(errors, actionDisplayName)}
        </SwapButton>
    );
};

function ActionText(errors: FormikErrors<SwapFormValues>, actionDisplayName: string): string {
    return errors.from?.toString()
        || errors.to?.toString()
        || errors.fromAsset
        || errors.toAsset
        || errors.currencyGroup
        || errors.amount
        || (actionDisplayName)
}

export default FormButton;