import { WalletProvider } from "@/context/LayerswapProvider"
import { EVMBalanceProvider, HyperliquidBalanceProvider, LoopringBalanceProvider, ZkSyncBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProvider from "./EVMProvider"
import { EVMGasProvider, LoopringGasProvider, ZkSyncGasProvider } from "./gasProviders"

export const useEVM: WalletProvider = {
    id: "evm",
    wrapper: EVMProvider,
    walletConnectionProvider: useEVMConnection,
    gasProvider: [new EVMGasProvider(), new LoopringGasProvider(), new ZkSyncGasProvider()],
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider(), new LoopringBalanceProvider(), new ZkSyncBalanceProvider()],
}