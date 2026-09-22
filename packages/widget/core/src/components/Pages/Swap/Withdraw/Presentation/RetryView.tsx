import SubmitButton from '@/components/Buttons/submitButton';

export function RetryView({
    message,
    canSwitchToStandard,
    onRetry,
    onSwitchToStandard,
}: {
    message?: string;
    canSwitchToStandard?: boolean;
    onRetry?: () => void;
    onSwitchToStandard?: () => void;
}) {
    return (
        <div className="space-y-2">
            {message && (
                <p className="text-sm text-secondary-text px-1">{message}</p>
            )}
            <SubmitButton
                isDisabled={false}
                isSubmitting={false}
                onClick={onRetry}
            >
                Try again
            </SubmitButton>
            {canSwitchToStandard && (
                <SubmitButton
                    buttonStyle="secondary"
                    isDisabled={false}
                    isSubmitting={false}
                    onClick={onSwitchToStandard}
                >
                    Switch to standard transfer
                </SubmitButton>
            )}
        </div>
    );
}
