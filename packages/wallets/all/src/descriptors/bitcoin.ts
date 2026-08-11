import type { WalletProviderDescriptor } from "@layerswap/widget/types"
import { defineWalletDescriptor } from "./defineWalletDescriptor"
import { hasStorageKeyMatching } from "./persistedSession"

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
        // `bigmi.<connectorId>.connected` — written on a successful connect,
        // removed on disconnect, and the flag bigmi's own `isAuthorized()`
        // gates its reconnect on. Deliberately not `bigmi.recentConnectorId`:
        // bigmi only ever writes that key, so it outlives disconnects and
        // rejected reconnects and kept hydrating Bitcoin (re-prompting the
        // wallet) on every load for anyone who had ever connected one.
        hasPersistedSession: () => hasStorageKeyMatching(/^bigmi\..+\.connected$/),
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-bitcoin')
            return mod.createBitcoinProvider()
        },
    })
}
