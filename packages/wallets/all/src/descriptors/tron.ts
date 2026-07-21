import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { WalletProvider } from "@layerswap/wallet-core/types"

const TRON_NETWORKS = ['TRON_MAINNET', 'TRON_TESTNET']

/**
 * Tree-shake-safe stand-in for `createTronProvider`. Defers `tronweb` +
 * `validator` (a transitive 125 KB dep of tronweb) + `bignumber.js` +
 * `google-protobuf` schemas — ~775 KB parsed / ~165 KB gzip — out of the
 * host's entry chunk.
 */
export function createTronDescriptor(): WalletProviderDescriptor {
    return {
        id: 'tron',
        name: 'Tron',
        autofillSupportedNetworks: TRON_NETWORKS,
        withdrawalSupportedNetworks: TRON_NETWORKS,
        asSourceSupportedNetworks: TRON_NETWORKS,
        loadProvider: async (): Promise<WalletProvider> => {
            const mod = await import('@layerswap/wallet-tron')
            return mod.createTronProvider()
        },
    }
}
