import type { NetworkType, WalletConnectConfig } from '@layerswap/widget-types'
import type { WalletProviderDescriptor } from '@layerswap/wallet-core/types'
import { defineWalletDescriptor, type DescriptorNetworkOptions } from './defineWalletDescriptor'
import { readStorageJson } from './persistedSession'

const STELLAR_NETWORKS = ['STELLAR_MAINNET', 'STELLAR_TESTNET']
const STELLAR_SESSION_KEY = 'layerswap:stellar-wallet'

type StellarPersistedSession = {
    walletId?: unknown
    address?: unknown
}

export function createStellarDescriptor(
    walletConnect?: WalletConnectConfig,
    options?: DescriptorNetworkOptions,
): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks ?? STELLAR_NETWORKS
    return defineWalletDescriptor({
        id: 'stellar',
        name: 'Stellar',
        capabilities: walletConnect?.projectId ? {
            walletConnectRegistry: {
                networkTypes: ['stellar' as NetworkType],
            },
        } : undefined,
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        hasPersistedSession: () => {
            const persisted = readStorageJson(STELLAR_SESSION_KEY) as StellarPersistedSession | undefined
            return typeof persisted?.walletId === 'string' && typeof persisted.address === 'string'
        },
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-stellar')
            return mod.createStellarProvider({ walletConnect })
        },
    })
}
