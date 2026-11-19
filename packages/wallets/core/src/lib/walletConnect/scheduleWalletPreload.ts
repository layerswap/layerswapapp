/** Start background wallet imports after page load, yielding to pending UI work. */
export function scheduleWalletPreload(preload: () => void): () => void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => { }
    }

    let cancelled = false
    let idleCallbackId: number | undefined
    let timeoutId: number | undefined

    const run = () => {
        if (!cancelled) preload()
    }

    const schedule = () => {
        if (typeof window.requestIdleCallback === 'function') {
            // A busy page must still prepare wallets without user interaction.
            idleCallbackId = window.requestIdleCallback(run, { timeout: 2000 })
        } else {
            timeoutId = window.setTimeout(run, 200)
        }
    }

    // The widget can mount after load, including after fetching its settings
    // or navigating client-side. In that case there is no future load event.
    if (document.readyState === 'complete') {
        schedule()
    } else {
        window.addEventListener('load', schedule, { once: true })
    }

    return () => {
        cancelled = true
        window.removeEventListener('load', schedule)
        if (idleCallbackId !== undefined && typeof window.cancelIdleCallback === 'function') {
            window.cancelIdleCallback(idleCallbackId)
        }
        if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
}
