export type WalletNativeCurrency = {
    symbol: string
    decimals: number
}

export type AppNetworkAdapter<Network> = {
    getId(network: Network): string
    getDisplayName(network: Network): string
    getChainId(network: Network): string | number | null | undefined
    getRpcUrls(network: Network): readonly string[]
    getIcon(network: Network): string | undefined
    getTransactionExplorerUrl(network: Network): string | undefined
    getAccountExplorerUrl(network: Network): string | undefined
    getNativeCurrency(network: Network): WalletNativeCurrency | undefined
    getMulticallAddress?(network: Network): string | undefined
    isEvmNetwork(network: Network): boolean
    isSolanaNetwork(network: Network): boolean
    isStarknetNetwork(network: Network): boolean
    isTronNetwork(network: Network): boolean
    isBitcoinNetwork(network: Network): boolean
    isTonNetwork(network: Network): boolean
    isFuelNetwork(network: Network): boolean
}

export const defineNetworkAdapter = <Network>(
    adapter: AppNetworkAdapter<Network>,
) => adapter
