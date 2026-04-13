/**
 * Normalizes errors thrown by the chain-specific WC connect flows into a
 * single `Error` with a consistent message. Used by both EVM (wagmi) and
 * Solana (`@solana/wallet-adapter-react`) connect paths.
 */
export function mapConnectError(e: unknown): Error {
    if (e instanceof Error && e.name === 'ConnectorAlreadyConnectedError') {
        return new Error('Wallet is already connected')
    }
    if (e instanceof Error) {
        return new Error(e.message || e.name || 'WalletConnect error')
    }
    return new Error(typeof e === 'string' ? e : 'WalletConnect error')
}
