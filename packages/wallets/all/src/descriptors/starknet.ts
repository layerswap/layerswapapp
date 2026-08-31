import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

// Inlined — importing `KnownInternalNames` pulls a runtime barrel that
// defeats lazy-loading. Keep in sync with packages/wallets/adapters/starknet/src/constants.ts.
const STARKNET_NETWORKS = ['STARKNET_MAINNET', 'STARKNET_SEPOLIA', 'STARKNET_GOERLI']

/**
 * Tree-shake-safe stand-in for `createStarknetProvider` — defers
 * `@layerswap/wallet-starknet` (`starknet`, starknetkit) out of the host's
 * entry chunk.
 */
export function createStarknetDescriptor(options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks ?? STARKNET_NETWORKS
    return defineWalletDescriptor({
        id: 'starknet',
        name: 'Starknet',
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        // Key presence isn't a session signal — any write to wallet-starknet's
        // store creates `ls-starknet-accounts`, even with empty state.
        // Hydrate eagerly only when actual account state exists.
        hasPersistedSession: () => {
            const persisted = readStorageJson('ls-starknet-accounts') as
                | { state?: { starknetAccounts?: Record<string, string>, activeWalletAddress?: string } }
                | undefined
            const state = persisted?.state
            return !!state?.activeWalletAddress || Object.keys(state?.starknetAccounts ?? {}).length > 0
        },
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-starknet')
            return mod.createStarknetProvider()
        },
    })
}
