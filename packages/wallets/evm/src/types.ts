import type { Config } from '@wagmi/core'
import type {
    BaseWalletProviderConfig,
    WalletProviderModule,
} from "@layerswap/widget/types"

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
     * Optional externally-created wagmi Config. When set, the EVM package
     * adopts it instead of creating its own. Connectors, chains, transports,
     * and reconnect lifecycle become the host's responsibility.
     */
    wagmiConfig?: Config
}
