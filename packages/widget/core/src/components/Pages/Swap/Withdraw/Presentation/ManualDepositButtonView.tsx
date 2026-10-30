import SubmitButton from '@/components/Buttons/submitButton';
export function ManualDepositButtonView({
    copied = false,
    loading = false,
    onCopy,
}: {
    copied?: boolean;
    loading?: boolean;
    onCopy?: () => void;
}) {
    return (
        <SubmitButton type="button" onClick={onCopy} isSubmitting={loading}>
            {loading ? 'Preparing deposit address…' : copied ? 'Copied!' : 'Copy deposit address'}
        </SubmitButton>
    );
}
