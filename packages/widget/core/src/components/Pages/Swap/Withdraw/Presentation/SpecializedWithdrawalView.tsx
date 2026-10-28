import { TransferBlock } from '../TransferBlock';
import { WalletIcon } from '@layerswap/ui-kit/components';
import type { Network } from '@layerswap/widget-types';
import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';
import WalletMessage from '../messages/Message';
import { ActionMessages } from '../messages/TransactionMessages';
import { ButtonWrapper } from './WalletActionsView';
export type SpecializedWithdrawalViewProps = {
    provider: string;
    preparationLabel?: string;
    network: Network;
    isConnected: boolean;
    accountMismatch: boolean;
    sourceAddress?: string;
    loading?: boolean;
    submissionAccepted?: boolean;
    readOnly?: boolean;
    progress?: { title: string; description?: string } | null;
    error?: { header: string; details: string } | null;
    rejected?: boolean;
    connectButton: ReactNode;
    handleWithdraw?: () => void;
};
export function SpecializedWithdrawalView({
    provider,
    preparationLabel = 'Preparing withdrawal',
    network,
    isConnected,
    accountMismatch,
    sourceAddress,
    loading,
    submissionAccepted,
    readOnly,
    progress,
    error,
    rejected,
    connectButton,
    handleWithdraw,
}: SpecializedWithdrawalViewProps) {
    if (submissionAccepted) {
        return <ButtonWrapper isDisabled isSubmitting>Transaction submitted</ButtonWrapper>;
    }
    if (!isConnected) {
        return (
            <div className="flex w-full flex-col gap-2">
                <WalletMessage
                    status="pending"
                    header={`Connect your ${provider} wallet`}
                    details={`Connect the wallet that owns your ${provider} balance to withdraw.`}
                />
                {connectButton}
            </div>
        );
    }

    if (accountMismatch) {
        return (
            <TransferBlock readOnly={readOnly} reasonCode="wallet_account_mismatch" path="ProviderWalletWithdrawal">
                <ActionMessages.WalletMismatchMessage
                    address={sourceAddress || ''}
                    network={network}
                />
            </TransferBlock>
        );
    }

    return (
        <div className="flex w-full flex-col gap-2 text-primary-text">
            {error && (
                <WalletMessage
                    status="error"
                    header={error.header}
                    details={error.details}
                />
            )}
            {rejected && <ActionMessages.TransactionRejectedMessage />}
            {/* Provider-surfaced prerequisite, such as account setup or balance preparation. */}
            {progress && (
                <WalletMessage
                    status="pending"
                    header={progress.title}
                    details={progress.description ?? ''}
                />
            )}
            {!loading && (
                <ButtonWrapper
                    onClick={handleWithdraw}
                    icon={<WalletIcon className="stroke-2 w-6 h-6" />}
                >
                    {error || rejected
                        ? 'Try again'
                        : `Withdraw from ${provider}`}
                </ButtonWrapper>
            )}
            {loading && (
                <ButtonWrapper
                    isSubmitting
                    isDisabled
                    icon={<Loader2 className="h-6 w-6 animate-spin" />}
                >
                    {progress
                        ? preparationLabel
                        : 'Withdrawing'}
                </ButtonWrapper>
            )}
        </div>
    );
}
