import { defaultWalletConnectChainRegistry, type WalletConnectChainRegistry } from '@layerswap/wallet-core'
import { registerEvmWalletConnectChain } from '@layerswap/wallet-evm'
import { registerSolanaWalletConnectChain } from '@layerswap/wallet-svm'
import { registerStellarWalletConnectChain } from '@layerswap/wallet-stellar'

export function registerDefaultWalletConnectChains(registry: WalletConnectChainRegistry = defaultWalletConnectChainRegistry): void {
    registerEvmWalletConnectChain(registry)
    registerSolanaWalletConnectChain(registry)
    registerStellarWalletConnectChain(registry)
}
