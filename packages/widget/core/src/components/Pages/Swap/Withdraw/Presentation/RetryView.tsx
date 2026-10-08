import SubmitButton from '@/components/Buttons/submitButton';

export function RetryView({
    canSwitchToStandard,
    onRetry,
    onSwitchToStandard,
    isChecking,
}: {
    canSwitchToStandard?: boolean;
    onRetry?: () => void;
    onSwitchToStandard?: () => void;
    isChecking?: boolean;
}) {
    return (
        <div className="space-y-2">
            <SubmitButton
                isDisabled={!!isChecking}
                isSubmitting={!!isChecking}
                onClick={onRetry}
            >
                Try again
            </SubmitButton>
            {canSwitchToStandard && (
                <SubmitButton
                    buttonStyle="secondary"
                    isDisabled={!!isChecking}
                    isSubmitting={!!isChecking}
                    onClick={onSwitchToStandard}
                >
                    Switch to standard transfer
                </SubmitButton>
            )}
        </div>
    );
}
