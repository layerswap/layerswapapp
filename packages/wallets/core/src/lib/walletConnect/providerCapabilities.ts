import type { NetworkType } from "@layerswap/widget-types"
import type { WalletConnectionProvider } from "@/types/wallet"

export const getProvidersForWalletConnectNetworkType = (
    providers: readonly WalletConnectionProvider[],
    networkType: NetworkType,
): WalletConnectionProvider[] =>
    providers.filter(provider =>
        provider.capabilities?.walletConnectRegistry?.networkTypes.includes(networkType),
    )
