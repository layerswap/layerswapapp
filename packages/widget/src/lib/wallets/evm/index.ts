import { WalletProvider } from "@/context/LayerswapProvider"
import { EVMBalanceProvider, HyperliquidBalanceProvider } from "./balanceProviders"
import { EVMGasProvider } from "./evmGasProvider"
import useEVMConnection from "./useEVMConnection"
import EVMProvider from "./EVMProvider"

export const useEVM: WalletProvider = {
    id: "evm",
    wrapper: EVMProvider,
    walletConnectionProvider: useEVMConnection,
    gasProvider: new EVMGasProvider(),
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider()],
}