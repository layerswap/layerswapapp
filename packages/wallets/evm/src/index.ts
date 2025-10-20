import { WalletProvider } from "@layerswap/widget/types";
import { EVMBalanceProvider, HyperliquidBalanceProvider, LoopringBalanceProvider, ZkSyncBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProvider from "./EVMProvider"
import { EVMGasProvider, LoopringGasProvider, ZkSyncGasProvider } from "./gasProviders"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"

export const useEVM: WalletProvider = {
    id: "evm",
    wrapper: EVMProvider,
    walletConnectionProvider: useEVMConnection,
    addressUtilsProvider: [new EVMAddressUtilsProvider],
    gasProvider: [new EVMGasProvider(), new LoopringGasProvider(), new ZkSyncGasProvider()],
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider(), new LoopringBalanceProvider(), new ZkSyncBalanceProvider()],
}