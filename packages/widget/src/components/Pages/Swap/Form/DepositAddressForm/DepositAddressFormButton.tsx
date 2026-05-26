import { FC } from "react";
import useCopyClipboard from "@/hooks/useCopyClipboard";
import { SubmitButton } from "@/components/Buttons";
import { SwapFormValues } from "../SwapFormValues";

type DepositAddressFormButtonProps = {
    values: SwapFormValues;
    isValid: boolean;
    error: string;
    isSubmitting: boolean;
    showDepositInfo: boolean;
    depositAddress: string | undefined;
    isProcessing: boolean;
    isCompleted: boolean;
    onDepositMore: () => void;
}

const DepositAddressFormButton: FC<DepositAddressFormButtonProps> = ({
    values, isValid, error, isSubmitting, showDepositInfo, depositAddress, isProcessing, isCompleted, onDepositMore,
}) => {
    const [copied, copy] = useCopyClipboard();

    if (isCompleted) {
        return (
            <SubmitButton type="button" onClick={onDepositMore}>
                Deposit more
            </SubmitButton>
        );
    }

    if (isProcessing) {
        return null;
    }

    if (showDepositInfo && depositAddress) {
        return (
            <SubmitButton type="button" onClick={() => copy(depositAddress)}>
                {copied ? 'Copied!' : 'Copy deposit address'}
            </SubmitButton>
        );
    }

    const waitingForAddress = !values?.destination_address;
    const label = error
        || (waitingForAddress ? 'Enter destination address' : 'Generating deposit address');

    return (
        <SubmitButton
            type="button"
            isDisabled
            isSubmitting={!waitingForAddress && isValid && !error && isSubmitting}
        >
            {label}
        </SubmitButton>
    );
};

export default DepositAddressFormButton;
