import { WalletProvider } from "@/context/LayerswapProvider"
import useZkSyncConnection from "./useZkSyncConnection"
import { ZkSyncBalanceProvider } from "./zkSyncBalanceProvider"
import { ZkSyncGasProvider } from "./zkSyncGasProvider"

export const useZkSync: WalletProvider = {
    id: "zksync",
    walletConnectionProvider: useZkSyncConnection,
    balanceProvider: new ZkSyncBalanceProvider(),
    gasProvider: new ZkSyncGasProvider(),
}

export { default as ZkSyncMultiStepHandler } from "./components/ZkSyncMultiStepHandler"