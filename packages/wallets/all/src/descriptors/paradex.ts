import { NetworkType } from '@layerswap/widget-types'
import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

/**
 * Tree-shake-safe stand-in for `createParadexProvider` — defers
 * `@paradex/sdk` → `starknet` out of the host's entry chunk.
 */
export function createParadexDescriptor(options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks
    return defineWalletDescriptor({
        id: 'paradex',
        supportedNetworkTypes: [NetworkType.Paradex],
        name: 'Paradex',
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        hideFromList: true,
        // Key presence isn't a session signal — any write to widget's
        // walletStore creates `ls-paradex-accounts`, even with no accounts.
        // Hydrate eagerly only when actual L1 → Paradex mappings exist.
        hasPersistedSession: () => {
            const persisted = readStorageJson('ls-paradex-accounts') as
                | { state?: { paradexAccounts?: Record<string, string> } }
                | undefined
            return Object.keys(persisted?.state?.paradexAccounts ?? {}).length > 0
        },
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-paradex')
            return mod.createParadexProvider()
        },
    })
}
