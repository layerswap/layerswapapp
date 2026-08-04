import type { WalletProviderDescriptor } from "@layerswap/ui-kit/types"
import type { TonClientConfig } from "@layerswap/wallet-ton"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { hasStorageKey } from "./persistedSession"

// Inlined — see notes in ./starknet.ts on why we don't import the chain
// package's constants (it would drag the SDK). Keep in sync with
// packages/wallets/ton/src/constants.ts and widget's `knownIds.ts`.
const TON_NETWORKS = ['TON_MAINNET', 'TON_TESTNET']

/**
 * Tree-shake-safe stand-in for `createTONProvider`. Defers `@tonconnect/sdk`
 * + `@ton/*` (~404 KB parsed / 139 KB gzip on `apps/bridge`) out of the
 * host's entry chunk. The TON wallet only appears when a tonConfigs is
 * supplied, mirroring the previous conditional in `getDefaultProviders`.
 */
export function createTONDescriptor(tonConfigs: TonClientConfig, options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks ?? TON_NETWORKS
    return defineWalletDescriptor({
        id: 'ton',
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
