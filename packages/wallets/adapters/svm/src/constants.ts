import { defaultWalletConnectChainRegistry, type WalletConnectChainDefinition, type WalletConnectChainRegistry } from '@layerswap/wallet-core'
import { NetworkType } from '@layerswap/widget-types'
import { KnownInternalNames } from "@layerswap/utils";export const name = 'Solana'
export const id = 'solana'
export const SolanaWalletConnectChain = { Mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', Devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', DeprecatedMainnet: 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ', DeprecatedDevnet: 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K' }
export const solanaWalletConnectChain: WalletConnectChainDefinition = { namespace: 'solana', networkType: NetworkType.Solana, explorerChainIds: [SolanaWalletConnectChain.Mainnet, SolanaWalletConnectChain.Devnet] }
export const registerSolanaWalletConnectChain = (registry: WalletConnectChainRegistry = defaultWalletConnectChainRegistry) => registry.register(solanaWalletConnectChain)
export const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaTestnet, KnownInternalNames.Networks.SolanaDevnet]
