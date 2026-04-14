import { resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import type { Web3ModalWallet } from "./api"
import { walletImageUrl } from "./api"
import type { WalletConnectWalletBase } from "./types"

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

// Wallets whose slugified name doesn't match what buildDeepLink expects
const SLUG_OVERRIDES: Record<string, string> = {
    'bitget-wallet': 'bitkeep',
}

export function mapWallet(wallet: Web3ModalWallet): WalletConnectWalletBase {
    let id = slugify(wallet.name)
    if (SLUG_OVERRIDES[id]) id = SLUG_OVERRIDES[id]

    const hasBrowserExtension = wallet.injected != null && wallet.injected.length > 0
    const installUrl = hasBrowserExtension ? (wallet.chrome_store ?? undefined) : undefined
    const isMobileSupported = !!wallet.mobile_link

    const knownOrder = resolveWalletConnectorIndex(id)

    return {
        id,
        name: wallet.name,
        icon: walletImageUrl(wallet.image_id),
        rdns: wallet.rdns || undefined,
        mobile: {
            native: null,
            universal: wallet.mobile_link || null,
        },
        desktop: wallet.desktop_link
            ? { native: null, universal: wallet.desktop_link }
            : undefined,
        chains: Array.isArray(wallet.chains) ? wallet.chains : [],
        hasBrowserExtension,
        installUrl,
        isMobileSupported,
        order: knownOrder >= 0 ? knownOrder : wallet.order,
    }
}
