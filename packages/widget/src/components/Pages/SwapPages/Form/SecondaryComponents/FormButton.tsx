import { FormSourceWalletButton } from "../../../../Input/SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import SwapButton from "../../../../Buttons/swapButton";
import { FormikErrors } from "formik";
import { SwapFormValues } from "../SwapFormValues";
import Address from "../../../../Input/Address";

// const Address = dynamic(() => import("../../../../Input/Address"), {
//     loading: () => <></>,
// });

const FormButton = ({
    shouldConnectWallet,
    values,
    isValid,
    errors,
    isSubmitting,
    actionDisplayName,
    partner
}) => {
    if (shouldConnectWallet) {
        return <FormSourceWalletButton />;
    }

    if (values?.to && !values?.destination_address) {
        return (
            <div>
                <Address partner={partner}>
                    {() => (
                        <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-md transform hover:brightness-125 transition duration-200 ease-in-out bg-primary text-primary-actionButtonText py-3 px-2 md:px-3 plausible-event-name=Swap+initiated">
                            <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                                <PlusIcon className="stroke-1" />
                            </span>
                            <span className="grow text-center">Enter destination address</span>
                        </div>
                    )}
                </Address>
            </div>
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
        || errors.fromCurrency
        || errors.toCurrency
        || errors.currencyGroup
        || errors.amount
        || (actionDisplayName)
}

export default FormButton;