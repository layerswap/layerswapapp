import { NetworkType } from '@layerswap/widget-types'
import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { TonClientConfig } from "@layerswap/wallet-ton"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { hasStorageKey } from "./persistedSession"

/**
 * Tree-shake-safe stand-in for `createTONProvider`. Defers `@tonconnect/sdk`
 * + `@ton/*` (~404 KB parsed / 139 KB gzip on `apps/bridge`) out of the
 * host's entry chunk. The TON wallet only appears when a tonConfigs is
 * supplied, mirroring the previous conditional in `getDefaultProviders`.
 */
export function createTONDescriptor(tonConfigs: TonClientConfig, options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks
    return defineWalletDescriptor({
        id: 'ton',
        supportedNetworkTypes: [NetworkType.TON],
        name: 'Ton',
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        // @tonconnect/sdk's connection storage key — holds both injected and
        // http (bridge) sessions that restoreConnection() can resume.
        hasPersistedSession: () => hasStorageKey('ton-connect-storage_bridge-connection'),
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-ton')
            return mod.createTONProvider({ tonConfigs })
        },
    })
}
