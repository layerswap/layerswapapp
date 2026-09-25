import { isUserRejection } from '../Wallet/Common/isUserRejection';
import { ActionMessageType, type Network } from '@layerswap/widget-types';
import { WalletUnknownError } from '../messages/Message';
import { ActionMessages } from '../messages/TransactionMessages';
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
    } else if (swapError) {
        return <ActionMessages.SwapErrorMessage />;
    } else if (error) {
        if (!error.message) return <WalletUnknownError expanded={expanded} />;
        return <WalletUnknownError expanded={expanded} />;
    } else return <></>;
}
