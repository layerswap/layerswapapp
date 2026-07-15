import type { InternalConnector } from "@/Models/WalletProvider"
import { chainsToNetworkTypes, type WalletConnectWalletBase } from "./types"

export const createRegistryConnector = (
    wallet: WalletConnectWalletBase,
    isMobilePlatform: boolean,
    providerName: string,
): InternalConnector => {
    const { chains, ...base } = wallet
    return {
        ...base,
        providerName,
        type: 'walletConnect',
        extensionNotFound: wallet.hasBrowserExtension ? !isMobilePlatform : false,
        networkTypes: chainsToNetworkTypes(chains),
    }
}
