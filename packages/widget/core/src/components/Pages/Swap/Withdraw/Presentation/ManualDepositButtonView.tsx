import SubmitButton from '@/components/Buttons/submitButton';
export function ManualDepositButtonView({
    copied = false,
    onCopy,
}: {
    copied?: boolean;
    onCopy?: () => void;
}) {
    return (
        <SubmitButton onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy deposit address'}
        </SubmitButton>
    );
}
