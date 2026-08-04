import type { WalletProviderDescriptor } from "@layerswap/ui-kit/types"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

const TRON_NETWORKS = ['TRON_MAINNET', 'TRON_TESTNET']

/**
 * Tree-shake-safe stand-in for `createTronProvider`. Defers `tronweb` +
 * `validator` (a transitive 125 KB dep of tronweb) + `bignumber.js` +
 * `google-protobuf` schemas — ~775 KB parsed / ~165 KB gzip — out of the
 * host's entry chunk.
 */
export function createTronDescriptor(options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks ?? TRON_NETWORKS
    return defineWalletDescriptor({
        id: 'tron',
        name: 'Tron',
        autofillSupportedNetworks: supportedNetworks,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        hasPersistedSession: () => typeof readStorageJson('tronAdapterName') === 'string',
        loadProvider: async () => {
            const mod = await import('@layerswap/wallet-tron')
            return mod.createTronProvider()
        },
    })
}
