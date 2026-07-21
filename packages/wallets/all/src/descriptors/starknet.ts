import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"

// Inlined so this module is tree-shake-safe — importing
// `KnownInternalNames` from `@layerswap/widget/internal` would pull a runtime
// barrel that defeats lazy-loading. Keep in sync with
// packages/wallets/starknet/src/constants.ts (single source of truth lives
// inside the chain package; this is the descriptor mirror).
const STARKNET_NETWORKS = ['STARKNET_MAINNET', 'STARKNET_SEPOLIA', 'STARKNET_GOERLI']

/**
 * Tree-shake-safe stand-in for `createStarknetProvider`. Keeps Starknet UI
 * gating (`autofillSupportedNetworks` etc.) static so route filtering still
 * works on first paint, and lazy-loads `@layerswap/wallet-starknet` only
 * when the host calls `loadProvider()` (typically on first connect-modal
 * open).
 */
export function createStarknetDescriptor(): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'starknet',
        name: 'Starknet',
        autofillSupportedNetworks: STARKNET_NETWORKS,
        withdrawalSupportedNetworks: STARKNET_NETWORKS,
        asSourceSupportedNetworks: STARKNET_NETWORKS,
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-starknet')
            return mod.createStarknetProvider()
        },
    })
}
