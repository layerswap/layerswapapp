import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

const BITCOIN_NETWORKS = ['BITCOIN_MAINNET', 'BITCOIN_TESTNET']

/**
 * Tree-shake-safe stand-in for `createBitcoinProvider`. Defers `bitcoinjs-lib`,
 * `@bigmi/client`, `bn.js`, and `tweetnacl` — combined ~280 KB parsed /
 * ~88 KB gzip — out of the host's entry chunk.
 */
export function createBitcoinDescriptor(options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks ?? BITCOIN_NETWORKS
    return defineWalletDescriptor({
        id: 'bitcoin',
        name: 'Bitcoin',
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        // Mirrors the real provider's snapshot (BitcoinConnectionService.buildProvider):
        // without it the pre-hydration stub counts Bitcoin as mobile-supported,
        // flipping platform-gated state once the descriptor loads.
        unsupportedPlatforms: ['mobile'],
        // @bigmi/client's `<prefix>.recentConnectorId`. A MetaMask marker is
        // not restorable (its reconnect opens a popup, so wallet-bitcoin's
        // NON_SILENT_CONNECTOR_IDS excludes it from session restore); the id
        // is inlined so this stub never imports the SDK.
        hasPersistedSession: () => {
            const recent = readStorageJson('bigmi.recentConnectorId')
            return typeof recent === 'string' && recent !== 'io.metamask.bitcoin'
        },
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-bitcoin')
            return mod.createBitcoinProvider()
        },
    })
}
