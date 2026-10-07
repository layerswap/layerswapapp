import SubmitButton from '@/components/Buttons/submitButton';

export function RetryView({
    canSwitchToStandard,
    onRetry,
    onSwitchToStandard,
}: {
    canSwitchToStandard?: boolean;
    onRetry?: () => void;
    onSwitchToStandard?: () => void;
}) {
    return (
        <div className="space-y-2">
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
