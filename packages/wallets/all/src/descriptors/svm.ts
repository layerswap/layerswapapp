import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"
import type { WalletProvider } from "@layerswap/wallet-core/types"
import type { WalletConnectConfig } from "@layerswap/wallet-evm"

// SVM's runtime list is built dynamically from `NetworkType.Solana` networks
// in `SvmConnectionService` — for static gating we mirror the universe of
// Solana network ids from widget's `knownIds.ts`. Extras don't hurt the
// route filter (it intersects with the active networks list); missing entries
// would.
const SVM_NETWORKS = ['SOLANA_MAINNET', 'SOLANA_TESTNET', 'SOLANA_DEVNET']

/**
 * Tree-shake-safe stand-in for `createSVMProvider`. Defers the eager portion
 * of `@solana/web3.js` (~142 KB parsed) and `@walletconnect` adapters dragged
 * by `SolanaWalletConnectAdapter` (~138 KB parsed) out of the host's entry
 * chunk.
 */
export function createSVMDescriptor(walletConnectConfigs?: WalletConnectConfig): WalletProviderDescriptor {
    return {
        id: 'solana',
        name: 'Solana',
        autofillSupportedNetworks: SVM_NETWORKS,
        withdrawalSupportedNetworks: SVM_NETWORKS,
        asSourceSupportedNetworks: SVM_NETWORKS,
        loadProvider: async (): Promise<WalletProvider> => {
            const mod = await import('@layerswap/wallet-svm')
            return mod.createSVMProvider({ walletConnectConfigs })
        },
    }
}
