import type {
    WalletProvider,
    WalletConnectionStore,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { createParadexConnection } from "./service/createParadexConnection"
import { createParadexTransfer } from "./transferProvider/createParadexTransfer"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
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

    const defaultTransferProviders = [createParadexTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "paradex",
        createConnection,
        gasProvider: finalGasProviders,
        transferProvider: finalTransferProviders,
        // balanceProvider: finalBalanceProviders,
    }
}

export { createParadexConnection } from "./service/createParadexConnection"
export { createParadexTransfer } from "./transferProvider/createParadexTransfer"
export { useParadexActiveStore } from "./service/paradexActiveStore"
