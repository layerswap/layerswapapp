import { NetworkType, type Network, type WalletErrorReasonCode } from '@layerswap/widget-types';
import type { WalletMessageProps } from './Message';

export const walletDisconnectedMessage: WalletMessageProps = {
    status: 'error',
    header: 'Wallet disconnected',
    details: 'Open your wallet and reconnect it to continue.',
};

/** Recovery copy for recognized request failures; raw provider details stay in telemetry. */
export function walletErrorMessage(
    reason: WalletErrorReasonCode,
    network: Network,
): WalletMessageProps | undefined {
    const networkName = network.display_name || 'the selected network';
    switch (reason) {
        case 'network_error':
            return {
                status: 'error',
                header: 'Network connection failed',
                details: network.type === NetworkType.EVM
                    ? `Your wallet couldn’t reach its ${networkName} RPC. In your wallet’s ${networkName} network settings, select a working RPC URL and remove any others, then try again.`
                    : `The wallet request on ${networkName} failed because of a connection error. Check your internet connection and try again.`,
            };
        case 'internal_rpc_error':
            return {
                status: 'error',
                header: 'Wallet request failed',
                details: `Your wallet or its network provider returned an error. Check your wallet for details before trying again.`,
            };
        case 'wallet_disconnected':
            return walletDisconnectedMessage;
        case 'request_pending':
            return {
                status: 'pending',
                header: 'Request already pending',
                details: 'Open your wallet and complete or reject the pending request before trying again.',
            };
        case 'timeout':
            return {
                status: 'error',
                header: 'Wallet response timed out',
                details: 'Check your wallet for a pending request or submitted transaction before trying again.',
            };
        default:
            return undefined;
    }
}
