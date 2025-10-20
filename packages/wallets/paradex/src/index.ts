import { WalletProvider } from "@layerswap/widget/types"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { useParadexConnection } from "./useParadexConnection"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"

export const ParadexProvider: WalletProvider = {
    id: "paradex",
    wrapper: ActiveParadexAccountProvider,
    walletConnectionProvider: useParadexConnection,
    balanceProvider: new ParadexBalanceProvider()
}

export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"