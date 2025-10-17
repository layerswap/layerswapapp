import { WalletProvider } from "@/context/LayerswapProvider"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { useParadexConnection } from "./useParadexConnection"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"
import { ParadexAddressUtilsProvider } from "./paradexAddressUtilsProvider"

export const useParadex: WalletProvider = {
    id: "paradex",
    wrapper: ActiveParadexAccountProvider,
    walletConnectionProvider: useParadexConnection,
    addressUtilsProvider: new ParadexAddressUtilsProvider(),
    balanceProvider: new ParadexBalanceProvider()
}

export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"