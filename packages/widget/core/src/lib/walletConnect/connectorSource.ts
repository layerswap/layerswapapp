import type { InternalConnector } from "@/types/wallet"

export type WalletConnectRegistryConnector = InternalConnector & {
    source: 'registry'
    type: 'walletConnect'
}

/**
 * Source and transport are independent connector properties. Both must match
 * before a connector can use the registry WalletConnect execution path.
 */
export const isWalletConnectRegistryConnector = (
    connector: InternalConnector | undefined,
): connector is WalletConnectRegistryConnector =>
    connector?.source === 'registry'
    && connector.type === 'walletConnect'
