import type { Config } from '@wagmi/core'
import type {
    BaseWalletProviderConfig,
    WalletConnectConfig,
    WalletProviderModule,
} from "@layerswap/ui-kit/types"
import type { EvmAdditionalSupportedNetworks } from "./service/networkBuckets"
import type { NetworkWithTokens } from "@layerswap/utils"

export type { WalletConnectConfig }

export type EVMProviderConfig<Network = NetworkWithTokens> = BaseWalletProviderConfig<Network> & {
    walletConnectConfigs?: WalletConnectConfig
    walletProviderModules?: WalletProviderModule[]
    /**
     * Optional externally-created wagmi Config. When set, the EVM package
     * adopts it instead of creating its own. Connectors, chains, transports,
     * and reconnect lifecycle become the host's responsibility.
     *
     * WalletConnect-registry wallets (deep links / per-wallet QR) connect
     * through the package's hidden WalletConnect connector. External configs
     * that don't include `createHiddenWalletConnectConnector()` in their
     * connectors won't offer registry wallets — only the config's own
     * connectors appear in the modal.
     */
    wagmiConfig?: Config
    additionalSupportedNetworks?: EvmAdditionalSupportedNetworks
    ethereumChainIds?: readonly number[]
}
