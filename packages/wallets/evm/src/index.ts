'use client'
import { WalletProvider } from "@layerswap/widget/types";
import { EVMBalanceProvider, HyperliquidBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { EVMGasProvider } from "./gasProviders"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"

export const EVMProvider: WalletProvider = {
    id: "evm",
    wrapper: EVMProviderWrapper,
    walletConnectionProvider: useEVMConnection,
    addressUtilsProvider: [new EVMAddressUtilsProvider()],
    gasProvider: new EVMGasProvider(),
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider()],
}
export { useChainConfigs } from "./evmUtils/chainConfigs";