import { isUserRejection } from '../Wallet/Common/isUserRejection';
import { normalizeWalletErrorCode } from '@layerswap/wallet-core/errors';
import { ActionMessageType, type Network } from '@layerswap/widget-types';
import WalletMessage, { WalletUnknownError } from '../messages/Message';
import { ActionMessages } from '../messages/TransactionMessages';
import { walletErrorMessage } from '../messages/walletErrorMessage';
export type ActionMessageViewProps = {
    error?: { name: string; message?: string };
    isLoading?: boolean;
    isSignatureError?: boolean;
    selectedSourceAddress: string;
    sourceNetwork: Network;
    gaslessUnavailable?: boolean;
    gaslessErrorMessage?: string;
    swapError?: boolean;
    expanded?: boolean;
};
export function ActionMessageView({
    error,
    isLoading,
    isSignatureError,
    selectedSourceAddress,
    sourceNetwork,
    gaslessUnavailable,
    gaslessErrorMessage,
    swapError,
    expanded,
}: ActionMessageViewProps) {
    if (gaslessUnavailable) {
        return (
            <ActionMessages.GaslessUnavailableMessage
                message={gaslessErrorMessage ?? undefined}
            />
        );
    }
    if (isLoading) {
        return <ActionMessages.ConfirmActionMessage />;
    }
    // A presentation label selects copy; execution classifies the underlying wallet evidence.
    if (error?.name === ActionMessageType.TransactionRejected || isUserRejection(error)) {
        return <ActionMessages.TransactionRejectedMessage isSignature={isSignatureError} />;
    } else if (error?.name === ActionMessageType.TransactionFailed) {
        return <ActionMessages.TransactionFailedMessage />;
    } else if (error?.name === ActionMessageType.TransactionExpired) {
        return <ActionMessages.TransactionExpiredMessage />;
    } else if (error?.name === ActionMessageType.InsufficientFunds) {
        return <ActionMessages.InsufficientFundsMessage />;
    } else if (error?.name === ActionMessageType.WaletMismatch) {
        return (
            <ActionMessages.WalletMismatchMessage
                address={selectedSourceAddress}
                network={sourceNetwork}
                details={error.message || undefined}
            />
        );
    } else if (
        error?.name === ActionMessageType.DifferentAccountsNotAllowedError
    ) {
        return (
            <ActionMessages.DifferentAccountsNotAllowedError
                network={error?.message || sourceNetwork.display_name}
            />
        );
    }
    // A generic swap flag must not hide an actionable wallet failure.
    if (error) {
        const message = walletErrorMessage(normalizeWalletErrorCode(error), sourceNetwork);
        if (message) return <WalletMessage {...message} />;
    }
    if (swapError) {
        return <ActionMessages.SwapErrorMessage />;
    } else if (error) {
        return <WalletUnknownError expanded={expanded} />;
    } else return <></>;
}
