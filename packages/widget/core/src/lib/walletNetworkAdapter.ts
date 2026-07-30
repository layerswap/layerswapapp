import { defineNetworkAdapter } from "@layerswap/ui-kit";
import { NetworkType, type NetworkWithTokens } from "@layerswap/utils";

export const walletNetworkAdapter = defineNetworkAdapter<NetworkWithTokens>({
    getId: network => network.name,
    getDisplayName: network => network.display_name,
    getChainId: network => network.chain_id,
    getRpcUrls: network => network.nodes?.length ? network.nodes : [network.node_url].filter(Boolean),
    getIcon: network => network.logo,
    getTransactionExplorerUrl: network => network.transaction_explorer_template,
    getAccountExplorerUrl: network => network.account_explorer_template,
    getNativeCurrency: network => network.token && {
        symbol: network.token.symbol,
        decimals: network.token.decimals,
    },
    getMulticallAddress: network => network.metadata?.evm_multicall_contract ?? undefined,
    isEvmNetwork: network => network.type === NetworkType.EVM,
    isSolanaNetwork: network => network.type === NetworkType.Solana,
    isStarknetNetwork: network => network.type === NetworkType.Starknet,
    isTronNetwork: network => network.type === NetworkType.Tron,
    isBitcoinNetwork: network => network.type === NetworkType.Bitcoin,
    isTonNetwork: network => network.type === NetworkType.TON,
    isFuelNetwork: network => network.type === NetworkType.Fuel,
});
