import type { NetworkType } from '@layerswap/widget-types'

export type WalletNativeCurrency = {
    symbol: string
    decimals: number
}

export type AppNetworkAdapter<Network> = {
    getId(network: Network): string
    getNetworkType(network: Network): NetworkType | undefined
    getDisplayName(network: Network): string
    getChainId(network: Network): string | number | null | undefined
    getRpcUrls(network: Network): readonly string[]
    getIcon(network: Network): string | undefined
    getTransactionExplorerUrl(network: Network): string | undefined
    getAccountExplorerUrl(network: Network): string | undefined
    getNativeCurrency(network: Network): WalletNativeCurrency | undefined
    getMulticallAddress?(network: Network): string | undefined
    validateAddress?(network: Network, address: string): boolean | undefined
    formatAddress?(network: Network, address: string): string | undefined
}

export const defineNetworkAdapter = <Network>(
    adapter: AppNetworkAdapter<Network>,
) => adapter
