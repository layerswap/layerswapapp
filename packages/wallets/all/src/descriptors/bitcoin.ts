import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { WalletProvider } from "@layerswap/wallet-core/types"

const BITCOIN_NETWORKS = ['BITCOIN_MAINNET', 'BITCOIN_TESTNET']

/**
 * Tree-shake-safe stand-in for `createBitcoinProvider`. Defers `bitcoinjs-lib`,
 * `@bigmi/client`, `bn.js`, and `tweetnacl` — combined ~280 KB parsed /
 * ~88 KB gzip — out of the host's entry chunk.
 */
export function createBitcoinDescriptor(): WalletProviderDescriptor {
    return {
        id: 'bitcoin',
        name: 'Bitcoin',
        autofillSupportedNetworks: BITCOIN_NETWORKS,
        withdrawalSupportedNetworks: BITCOIN_NETWORKS,
        asSourceSupportedNetworks: BITCOIN_NETWORKS,
        loadProvider: async (): Promise<WalletProvider> => {
            const mod = await import('@layerswap/wallet-bitcoin')
            return mod.createBitcoinProvider()
        },
    }
}
