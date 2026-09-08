import { isMobile } from "@layerswap/utils"

export const isSafeDeepLink = (link: string): boolean => {
    try {
        const protocol = new URL(link).protocol
        return protocol !== 'javascript:' && protocol !== 'data:'
    } catch {
        return false
    }
}

/**
 * Foregrounds the connected wallet app right before a sign request.
 * WC-connected wallets on mobile receive the request over the relay while
 * backgrounded — without this the OS never shows the open-in-wallet prompt.
 */
export const foregroundWalletApp = async (deepLink: string | undefined): Promise<void> => {
    if (!isMobile() || !deepLink || !isSafeDeepLink(deepLink)) return
    window.location.href = deepLink
    await new Promise(resolve => setTimeout(resolve, 100))
}
