import KnownInternalNames from '@layerswap/utils/known-ids'
import { defaultWalletConnectChainRegistry, type WalletConnectChainDefinition, type WalletConnectChainRegistry } from '@layerswap/wallet-core'
import { NetworkType } from '@layerswap/widget-types'

export const name = 'Stellar'
export const id = 'stellar' as const
export const StellarWalletConnectChain = { Public: 'stellar:pubnet', Testnet: 'stellar:testnet' }
export const stellarWalletConnectChain: WalletConnectChainDefinition = { namespace: 'stellar', networkType: NetworkType.Stellar, explorerChainIds: [StellarWalletConnectChain.Public, StellarWalletConnectChain.Testnet] }
export const registerStellarWalletConnectChain = (registry: WalletConnectChainRegistry = defaultWalletConnectChainRegistry) => registry.register(stellarWalletConnectChain)

export const supportedNetworkNames = [
    KnownInternalNames.Networks.StellarMainnet,
    KnownInternalNames.Networks.StellarTestnet,
] as const

export const STELLAR_SESSION_KEY = 'layerswap:stellar-wallet'
