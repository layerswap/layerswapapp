import type { NetworkType } from "@/Models/Network"
import type { WalletConnectionProvider } from "@/types/wallet"

export const getProvidersForWalletConnectNetworkType = (
    providers: readonly WalletConnectionProvider[],
    networkType: NetworkType,
): WalletConnectionProvider[] =>
    providers.filter(provider =>
        provider.capabilities?.walletConnectRegistry?.networkTypes.includes(networkType),
    )
