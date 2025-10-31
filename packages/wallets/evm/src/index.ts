'use client'
import { WalletProvider } from "@layerswap/widget/types";
import { EVMBalanceProvider, HyperliquidBalanceProvider, LoopringBalanceProvider, ZkSyncBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { EVMGasProvider, LoopringGasProvider, ZkSyncGasProvider } from "./gasProviders"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"

export const EVMProvider: WalletProvider = {
    id: "evm",
    wrapper: EVMProviderWrapper,
    walletConnectionProvider: useEVMConnection,
    addressUtilsProvider: [new EVMAddressUtilsProvider()],
    gasProvider: [new EVMGasProvider(), new LoopringGasProvider(), new ZkSyncGasProvider()],
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider(), new LoopringBalanceProvider(), new ZkSyncBalanceProvider()],
}

export { useChainConfigs } from "./evmUtils/chainConfigs";