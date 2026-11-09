import FailIcon from '@/components/Icons/FailIcon';
import { DEPOSIT_ADDRESS_ERROR_TITLE } from '@/lib/depositAddressError';
import { ErrorDisplay } from '../SecondaryComponents/validationError/ErrorDisplay';
import { DepositAddressFormButtonView } from './DepositAddressFormButtonView';

export function DepositAddressErrorView({ message }: { message: string }) {
    return <div role="alert">
        <ErrorDisplay icon={<FailIcon width={20} height={20} />}
            title={DEPOSIT_ADDRESS_ERROR_TITLE} message={message} />
    </div>;
}

export function DepositAddressRecoveryView({ message, isRetrying, onRetry }: {
    message: string;
    isRetrying: boolean;
    onRetry: () => void;
}) {
    return <div className="flex flex-col gap-2 w-full">
        <DepositAddressErrorView message={message} />
        <DepositAddressFormButtonView hasDepositError isValid isSubmitting={isRetrying}
            showDepositInfo={false} depositAddress={undefined} isProcessing={false}
            isCompleted={false} onRetry={onRetry} />
    </div>;
}
