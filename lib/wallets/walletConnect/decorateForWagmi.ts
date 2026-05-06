import { WalletConnectWallet } from "@/Models/WalletConnectWallet"
import { WALLETCONNECT_PROJECT_ID } from "./config"
import type { WalletConnectWalletBase } from "./types"

/**
 * Decorate a shared-registry wallet with the wagmi-specific fields consumed by
 * the custom `walletConnect()` connector factory (projectId, showQrModal, ...).
 * Chain-agnostic — callers that need a registry marker attach it on top.
 */
export const decorateForWagmi = (base: WalletConnectWalletBase): WalletConnectWallet => {
    const isWalletConnectSupported = base.isMobileSupported || !!base.desktop?.universal || !!base.desktop?.native
    const type = isWalletConnectSupported ? "walletConnect" : "other"

    return {
        id: base.id,
        name: base.name,
        mobile: {
            native: base.mobile?.native ?? '',
            universal: base.mobile?.universal ?? '',
        },
        rdns: base.rdns ? `${base.rdns}.wc` : undefined,
        icon: base.icon,
        projectId: WALLETCONNECT_PROJECT_ID,
        showQrModal: false,
        customStoragePrefix: base.id,
        order: base.order,
        type,
        isMobileSupported: base.isMobileSupported,
        hasBrowserExtension: base.hasBrowserExtension,
        installUrl: base.installUrl,
        extensionNotFound: type === 'walletConnect',
        providerName: base.name,
    }
}
