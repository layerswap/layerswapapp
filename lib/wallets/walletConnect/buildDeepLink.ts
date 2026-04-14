import { isAndroid, isIOS, isMobile } from "../connectors/utils/isMobile"
import type { WalletConnectMobile } from "./types"

const addWc = (url: string): string => {
    if (url.endsWith("://")) return url + "wc"
    if (url.endsWith("/")) return url + "wc"
    return url + "/wc"
}

type BuildDeepLinkInput = {
    id: string
    mobile: WalletConnectMobile
}

/**
 * Chain-agnostic mobile deep-link builder for a given WC wallet + raw WC URI.
 * - Android: most wallets handle the bare `wc:` URI via OS intents, so we pass it through.
 * - Off-mobile: returns the raw URI (used by the QR copy-link button).
 * - iOS / other mobile: prefers wallet's native scheme, falls back to universal link.
 * - Slug-specific overrides match rainbowkit's well-known quirks.
 */
export function buildDeepLink({ id, mobile }: BuildDeepLinkInput, uri: string): string {
    switch (id) {
        case "bitkeep":
        case "bitget-wallet":
            return isAndroid() ? uri : `bitkeep://wc?uri=${encodeURIComponent(uri)}`
        case "metamask":
            // MetaMask's native scheme is broken on iOS v6.5.0+, so prefer the universal link on iOS
            // https://github.com/MetaMask/metamask-mobile/issues/6457
            return isAndroid()
                ? uri
                : `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`
        case "okx-wallet":
            return isAndroid() ? uri : `okex://main/wc?uri=${encodeURIComponent(uri)}`
        case "rainbow":
            return isAndroid()
                ? uri
                : isIOS()
                    ? `rainbow://wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`
                    : `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`
        default: {
            if (isAndroid() || !isMobile()) return uri
            if (mobile?.native) return `${addWc(mobile.native)}?uri=${encodeURIComponent(uri)}`
            if (mobile?.universal) return `${addWc(mobile.universal)}?uri=${encodeURIComponent(uri)}`
            return uri
        }
    }
}
