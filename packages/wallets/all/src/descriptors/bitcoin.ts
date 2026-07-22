import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"
import { hasStorageKey } from "./persistedSession"

const BITCOIN_NETWORKS = ['BITCOIN_MAINNET', 'BITCOIN_TESTNET']

/**
 * Tree-shake-safe stand-in for `createBitcoinProvider`. Defers `bitcoinjs-lib`,
 * `@bigmi/client`, `bn.js`, and `tweetnacl` — combined ~280 KB parsed /
 * ~88 KB gzip — out of the host's entry chunk.
 */
export function createBitcoinDescriptor(): WalletProviderDescriptor {
    return defineWalletDescriptor({
        id: 'bitcoin',
        name: 'Bitcoin',
        autofillSupportedNetworks: BITCOIN_NETWORKS,
        withdrawalSupportedNetworks: BITCOIN_NETWORKS,
        asSourceSupportedNetworks: BITCOIN_NETWORKS,
        // Mirrors the real provider's snapshot (BitcoinConnectionService.buildProvider):
        // without it the pre-hydration stub counts Bitcoin as mobile-supported,
        // flipping platform-gated state once the descriptor loads.
        unsupportedPlatforms: ['mobile'],
        // @bigmi/client's `<prefix>.recentConnectorId` — what its reconnect()
        // (called in wallet-bitcoin's getBitcoinConfig) restores from.
        hasPersistedSession: () => hasStorageKey('bigmi.recentConnectorId'),
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-bitcoin')
            return mod.createBitcoinProvider()
        },
    })
}
