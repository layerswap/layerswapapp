import type { ReactNode } from 'react';
import SubmitButton from '../Buttons/submitButton';
import SecondaryButton from '../Buttons/secondaryButton';
export function ConfirmationContent({
    children,
    submitText,
    dismissText,
    onConfirm,
    onDismiss,
}: {
    children?: ReactNode;
    submitText?: string;
    dismissText?: string;
    onConfirm?: () => void;
    onDismiss?: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-2 mt-2">
            {children}
            <div className="h-full w-full space-y-3">
                <SubmitButton type="button" onClick={onConfirm}>
                    {submitText ?? 'Confirm'}
                </SubmitButton>
                {dismissText && (
                    <SecondaryButton
                        className="w-full h-full py-3 !text-base text-primary-text"
                        size="xl"
                        onClick={onDismiss}
                    >
                        {dismissText}
                    </SecondaryButton>
                )}
            </div>
        </div>
    );
}
