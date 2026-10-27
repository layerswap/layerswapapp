import { defineNetworkAdapter } from "@layerswap/utils";
import { type NetworkWithTokens } from "@layerswap/widget-types";

export const walletNetworkAdapter = defineNetworkAdapter<NetworkWithTokens>({
    getNetworkType: network => network.type,
    getId: network => network.name,
    getDisplayName: network => network.display_name,
    getChainId: network => network.chain_id,
    getRpcUrls: network => network.nodes?.length ? network.nodes : [network.node_url].filter(Boolean),
    getIcon: network => network.logo,
    getTransactionExplorerUrl: network => network.transaction_explorer_template,
    getAccountExplorerUrl: network => network.account_explorer_template,
    getNativeCurrency: network => network.token && {
        symbol: network.token.asset,
        decimals: network.token.decimals,
    },
    getMulticallAddress: network => network.metadata?.evm_multicall_contract ?? undefined,
});
