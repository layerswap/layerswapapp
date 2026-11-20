/** Convert Telegram's generated connection URL to its native Mini App link. */
export function getTonConnectDeepLink(universalLink: string, deepLink?: string): string {
    const url = new URL(universalLink)
    if (url.hostname === 't.me' && url.searchParams.has('startapp')) {
        const [bot, appName] = url.pathname.split('/').filter(Boolean)
        if (bot) {
            // https://core.telegram.org/api/links#direct-mini-app-links
            const native = new URL('tg://resolve')
            native.searchParams.set('domain', bot)
            if (appName) native.searchParams.set('appname', appName)
            url.searchParams.forEach((value, key) => native.searchParams.set(key, value))
            return native.toString()
        }
    }

    if (!deepLink) return universalLink
    const qIdx = universalLink.indexOf('?')
    if (qIdx === -1) return deepLink
    const params = universalLink.slice(qIdx)
    return deepLink.includes('?') ? `${deepLink}&${params.slice(1)}` : `${deepLink}${params}`
}
