import { defaultWalletConnectChainRegistry, type WalletConnectChainDefinition, type WalletConnectChainRegistry } from '@layerswap/wallet-core'
import { NetworkType } from '@layerswap/widget-types'
import { KnownInternalNames } from "@layerswap/utils";export const name = 'EVM'
export const id = 'evm'
export const EIP155_NAMESPACE = 'eip155'
export const evmWalletConnectChain: WalletConnectChainDefinition = { namespace: EIP155_NAMESPACE, networkType: NetworkType.EVM, explorerChainIds: ['eip155:1', 'eip155:10', 'eip155:56', 'eip155:137', 'eip155:43114', 'eip155:42161', 'eip155:324', 'eip155:8453'] }
export const registerEvmWalletConnectChain = (registry: WalletConnectChainRegistry = defaultWalletConnectChainRegistry) => registry.register(evmWalletConnectChain)
export const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
export const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVM]

export const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

export const HIDDEN_WALLETCONNECT_ID = 'hiddenWalletConnect'
