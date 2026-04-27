import { isIOS, isMobile } from "../wallets/utils/isMobile"
import type { WalletConnectMobile } from "./types"

const addWc = (url: string): string => {
    if (url.endsWith("/wc") || url.endsWith("://wc")) return url
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
 * - Off-mobile: returns the raw URI (used by the QR copy-link button).
 * - Mobile: builds a wallet-specific deep link. Returning the bare `wc:` URI
 *   on Android lets the OS route to whichever WC-capable app is the default
 *   handler (which is why "pick Backpack, Rainbow opens" happens), so we
 *   always target the selected wallet explicitly when we can.
 * - Slug-specific overrides match rainbowkit's well-known quirks.
 */
export function buildDeepLink({ id, mobile }: BuildDeepLinkInput, uri: string): string {
    if (!isMobile()) return uri

    switch (id) {
        case "bitkeep":
        case "bitget-wallet":
            return `bitkeep://wc?uri=${encodeURIComponent(uri)}`
        case "metamask":
            // MetaMask's native scheme is broken on iOS v6.5.0+, so prefer the universal link
            // https://github.com/MetaMask/metamask-mobile/issues/6457
            return `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`
        case "okx-wallet":
            return `okex://main/wc?uri=${encodeURIComponent(uri)}`
        case "rainbow":
            return isIOS()
                ? `rainbow://wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`
                : `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}&connector=rainbowkit`
        default: {
            if (mobile?.native) return `${addWc(mobile.native)}?uri=${encodeURIComponent(uri)}`
            if (mobile?.universal) return `${addWc(mobile.universal)}?uri=${encodeURIComponent(uri)}`
            return uri
        }
    }
}
