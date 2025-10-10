import { WalletProvider } from "@/context/LayerswapProvider"
import useLoopringConnection from "./useLoopringConnection"
import { LoopringGasProvider } from "./loopringGasProvider"
import { LoopringBalanceProvider } from "./loopringBalanceProvider"

export const useLoopring: WalletProvider = {
    id: "loopring",
    walletConnectionProvider: useLoopringConnection,
    balanceProvider: new LoopringBalanceProvider(),
    gasProvider: new LoopringGasProvider(),
}

export { default as LoopringMultiStepHandler } from "./components/LoopringMultiStepHandler"