import type { Config } from '@wagmi/core'
import type {
    BaseWalletProviderConfig,
    WalletProviderModule,
} from "@layerswap/wallet-core/types"

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type EVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
    walletProviderModules?: WalletProviderModule[]
    /**
     * Lets an embedding host intentionally share its existing wagmi config
     * with Layerswap. Omit this when the host and Layerswap need independent
     * wallet sessions.
     */
    wagmiConfig?: Config
}
