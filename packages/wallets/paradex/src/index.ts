import type {
    WalletProvider,
    WalletConnectionStore,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { createParadexConnection } from "./service/createParadexConnection"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
    } = config

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        if (customConnection) {
            return customConnection(props)
        }
        return createParadexConnection(props)
    }

    const defaultBalanceProviders = [new ParadexBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : undefined

    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : undefined

    return {
        id: "paradex",
        createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        // balanceProvider: finalBalanceProviders,
    }
}

export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"
export { createParadexConnection } from "./service/createParadexConnection"
export { useParadexActiveStore } from "./service/paradexActiveStore"
export { useActiveParadexAccount } from "./useActiveParadexAccount"
