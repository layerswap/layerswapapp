import { FC } from 'react';
import SubmitButton from '@/components/Buttons/submitButton';

export type DepositAddressFormButtonViewProps = {
    waitingForAddress?: boolean;
    copied?: boolean;
    onCopy?: () => void;
    isValid: boolean;
    error?: string;
    isSubmitting: boolean;
    showDepositInfo: boolean;
    depositAddress: string | undefined;
    isProcessing: boolean;
    isCompleted: boolean;
    hasDepositError?: boolean;
    onRetry?: () => void;
    onDepositMore?: () => void;
};

export const DepositAddressFormButtonView: FC<
    DepositAddressFormButtonViewProps
> = ({
    waitingForAddress,
    copied,
    onCopy,
    isValid,
    error,
    isSubmitting,
    showDepositInfo,
    depositAddress,
    isProcessing,
    isCompleted,
    hasDepositError,
    onDepositMore,
    onRetry,
}) => {
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

    if (hasDepositError) {
        return (
            <SubmitButton
                type="button"
                buttonStyle="secondary"
                onClick={onRetry}
                isDisabled={!isValid}
                isSubmitting={isSubmitting}
            >
                Retry
            </SubmitButton>
        );
    }

    if (showDepositInfo && depositAddress) {
        return (
            <SubmitButton type="button" onClick={onCopy}>
                {copied ? 'Copied!' : 'Copy deposit address'}
            </SubmitButton>
        );
    }

    const label =
        error ||
        (waitingForAddress
            ? 'Enter destination address'
            : 'Generating deposit address');

    return (
        <SubmitButton
            type="button"
            isDisabled
            isSubmitting={
                !waitingForAddress && isValid && !error && isSubmitting
            }
        >
            {label}
        </SubmitButton>
    );
};
