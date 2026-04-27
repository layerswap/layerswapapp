import { InternalConnector } from "@/types/wallet"
import { WC_REGISTRY_MARKER, type RegistryAttachedConnector, type WalletConnectWalletBase } from "./types"

export type RegistryConnector = RegistryAttachedConnector<InternalConnector>

export const createRegistryConnector = (
    wallet: WalletConnectWalletBase,
    isMobilePlatform: boolean,
    providerName: string,
): RegistryConnector => ({
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    type: 'walletConnect',
    order: wallet.order,
    isMobileSupported: wallet.isMobileSupported,
    hasBrowserExtension: wallet.hasBrowserExtension,
    installUrl: wallet.installUrl,
    extensionNotFound: wallet.hasBrowserExtension ? !isMobilePlatform : false,
    providerName,
    [WC_REGISTRY_MARKER]: wallet,
})
