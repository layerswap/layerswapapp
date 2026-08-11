import { chainsToNetworkTypes, type WalletConnectWalletBase } from "./types"
import type { WalletConnectRegistryConnector } from "./connectorSource"

export const createRegistryConnector = (
    wallet: WalletConnectWalletBase,
    isMobilePlatform: boolean,
    providerName: string,
): WalletConnectRegistryConnector => ({
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    type: 'walletConnect',
    source: 'registry',
    order: wallet.order,
    isMobileSupported: wallet.isMobileSupported,
    hasBrowserExtension: wallet.hasBrowserExtension,
    installUrl: wallet.installUrl,
    extensionNotFound: wallet.hasBrowserExtension ? !isMobilePlatform : false,
    providerName,
    networkTypes: chainsToNetworkTypes(wallet.chains),
    mobile: wallet.mobile,
})
