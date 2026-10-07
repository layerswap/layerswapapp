import { WalletIcon } from '@layerswap/ui-kit/components';
import type { Network } from '@layerswap/widget-types';
import { Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';
import WalletMessage from '../messages/Message';
import { ActionMessages } from '../messages/TransactionMessages';
import { ButtonWrapper } from './WalletActionsView';
export type SpecializedWithdrawalViewProps = {
    provider: 'Hyperliquid' | 'Polymarket';
    network: Network;
    isConnected: boolean;
    accountMismatch: boolean;
    sourceAddress?: string;
    loading?: boolean;
    progress?: { title: string; description?: string } | null;
    error?: { header: string; details: string } | null;
    rejected?: boolean;
    connectButton: ReactNode;
    handleWithdraw?: () => void;
};
export function SpecializedWithdrawalView({
    provider,
    network,
    isConnected,
    accountMismatch,
    sourceAddress,
    loading,
    progress,
    error,
    rejected,
    connectButton,
    handleWithdraw,
}: SpecializedWithdrawalViewProps) {
    if (!isConnected) {
        return (
            <div className="w-full space-y-3">
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
            <ActionMessages.WalletMismatchMessage
                address={sourceAddress || ''}
                network={network}
            />
        );
    }

    return (
        <div className="w-full space-y-3 text-primary-text">
            {error && (
                <WalletMessage
                    status="error"
                    header={error.header}
                    details={error.details}
                />
            )}
            {rejected && <ActionMessages.TransactionRejectedMessage />}
            {/* Provider-surfaced prerequisite step (e.g. moving funds between HL Spot/Perps). */}
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
                        ? provider === 'Hyperliquid'
                            ? 'Preparing balance'
                            : 'Setting up your account'
                        : 'Withdrawing'}
                </ButtonWrapper>
            )}
        </div>
    );
}
