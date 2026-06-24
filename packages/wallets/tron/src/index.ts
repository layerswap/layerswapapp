import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { TronGasProvider } from "./tronGasProvider"
import { createTronTransfer } from "./transferProvider/createTronTransfer"
import { createTronConnection } from "./service/createTronConnection"
import { initTronProvider } from "./init"

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initTronProvider()
        // No-op disposer; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initTronProvider()
        if (customConnection) {
            return customConnection(props)
        }
        return createTronConnection(props)
    }

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new TronGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultTransferProviders = [createTronTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "tron",
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createTronConnection } from "./service/createTronConnection"
export { useTronStore } from "./service/tronStore"
