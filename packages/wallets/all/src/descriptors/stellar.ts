import KnownInternalNames from '@layerswap/utils/known-ids'
import type { NetworkType, WalletConnectConfig } from '@layerswap/widget-types'
import { LazySwapPrerequisiteProvider } from '@layerswap/widget-types'
import type { WalletProviderDescriptor } from '@layerswap/wallet-core/types'
import { defineWalletDescriptor, type DescriptorNetworkOptions } from './defineWalletDescriptor'
import { readStorageJson } from './persistedSession'

const STELLAR_NETWORKS = [KnownInternalNames.Networks.StellarMainnet, KnownInternalNames.Networks.StellarTestnet]
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
        swapPrerequisiteProvider: new LazySwapPrerequisiteProvider(
            'stellar-recipient',
            context => supportedNetworks.includes(context.destination.network.name)
                && (context.destination.token.symbol !== 'XLM' || !!context.destination.token.contract),
            () => import('@layerswap/wallet-stellar').then(module => module.stellarPrerequisiteProvider),
        ),
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
