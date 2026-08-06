import { resolveWalletIdentity } from "../wallets/identity"
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
    name?: string
    mobile: WalletConnectMobile
}

/**
 * Chain-agnostic mobile deep-link builder for a given WC wallet + raw WC URI.
 * - Off-mobile: returns the raw URI (used by the QR copy-link button).
 * - Mobile: builds a wallet-specific deep link. Returning the bare `wc:` URI
 *   on Android lets the OS route to whichever WC-capable app is the default
 *   handler (which is why "pick Backpack, Rainbow opens" happens), so we
 *   always target the selected wallet explicitly when we can.
 * - Per-wallet quirks live in the wallet catalog's `deepLink` overrides.
 */
export function buildDeepLink({ id, name, mobile }: BuildDeepLinkInput, uri: string): string {
    if (!isMobile()) return uri

    const catalog = resolveWalletIdentity({ registryId: id, nativeId: id, name }).catalog
    if (catalog?.deepLink) return catalog.deepLink(uri, { isIOS: isIOS() })

    if (mobile?.native) return `${addWc(mobile.native)}?uri=${encodeURIComponent(uri)}`
    if (mobile?.universal) return `${addWc(mobile.universal)}?uri=${encodeURIComponent(uri)}`
    return uri
}
