import type {
    WalletProvider,
    WalletConnectionStore,
    WalletInitContext,
    WalletConnectionProviderProps,
    BaseWalletProviderConfig,
    WalletConnectConfig,
} from "@layerswap/widget/types"
import { LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { SolanaBalanceProvider } from "./svmBalanceProvider"
import { createSvmTransfer } from "./transferProvider/createSvmTransfer"
import { createSvmConnection } from "./service/createSvmConnection"
import { initSvmProvider } from "./init"
import { id } from "./constants"

export type { WalletConnectConfig }

export type SVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

// The literal id in the return type lets `defineWalletDescriptor` in
// `@layerswap/wallets` verify it matches the descriptor id at compile time.
export function createSVMProvider(config: SVMProviderConfig = {}): WalletProvider & { id: typeof id } {
    const {
        walletConnectConfigs,
        customConnection,
        balanceProviders,
        gasProviders,
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

    const defaultTransferProviders = [createSvmTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id,
        init,
        createConnection,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

export { createSvmConnection } from "./service/createSvmConnection"
export { useSvmStore } from "./service/svmStore"
export { svmAdapterManager } from "./service/svmAdapterManager"
