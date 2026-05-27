import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
} from "@layerswap/widget/types"
import { LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { SolanaBalanceProvider } from "./svmBalanceProvider"
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider"
import { createSvmTransfer } from "./transferProvider/createSvmTransfer"
import { createSvmConnection } from "./service/createSvmConnection"
import { initSvmProvider } from "./init"

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type SVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

export function createSVMProvider(config: SVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const init = (_ctx: WalletInitContext) => {
        initSvmProvider({ walletConnectConfigs })
        // No-op disposer; init is idempotent across remounts.
    }

    const createConnection = (props: WalletConnectionProviderProps): WalletConnectionStore => {
        initSvmProvider({ walletConnectConfigs })
        if (customConnection) {
            return customConnection(props)
        }
        return createSvmConnection(props)
    }

    const defaultBalanceProviders = [new SolanaBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.Solana,
            () => import("./svmGasProvider").then(m => new m.SolanaGasProvider())
        )
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new SolanaAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [createSvmTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "solana",
        init,
        createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createSvmConnection } from "./service/createSvmConnection"
export { useSvmStore } from "./service/svmStore"
export { svmAdapterManager } from "./service/svmAdapterManager"
