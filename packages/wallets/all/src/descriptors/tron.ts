import { NetworkType } from '@layerswap/widget-types'
import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import { defineWalletDescriptor, type DescriptorNetworkOptions } from "./defineWalletDescriptor"
import { readStorageJson } from "./persistedSession"

/**
 * Tree-shake-safe stand-in for `createTronProvider`. Defers `tronweb` +
 * `validator` (a transitive 125 KB dep of tronweb) + `bignumber.js` +
 * `google-protobuf` schemas — ~775 KB parsed / ~165 KB gzip — out of the
 * host's entry chunk.
 */
export function createTronDescriptor(options?: DescriptorNetworkOptions): WalletProviderDescriptor {
    const supportedNetworks = options?.supportedNetworks
    return defineWalletDescriptor({
        id: 'tron',
        supportedNetworkTypes: [NetworkType.Tron],
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
