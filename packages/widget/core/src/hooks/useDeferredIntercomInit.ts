import { useEffect, useState } from "react"

type WindowWithIdle = typeof window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number
    cancelIdleCallback?: (id: number) => void
}

/**
 * Returns `true` once the browser reports it is idle (or `timeoutMs` passes),
 * meant to be passed to `IntercomProvider`'s `shouldInitialize` so the widget
 * script is not injected during the critical-path render.
 *
 * Why: `IntercomProvider` injects `widget.intercom.io/widget/<appId>` on
 * mount, which pulls ~342 KB of third-party JS that competes with our own
 * code for parse/compile time. Keeping the provider in the tree (so children
 * do not remount) but flipping `shouldInitialize` later costs us nothing on
 * first paint and the help widget still arrives a few seconds into the
 * session.
 */
export function useDeferredIntercomInit(timeoutMs = 6000): boolean {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (typeof window === "undefined") return
        const w = window as WindowWithIdle
        const fire = () => setReady(true)

        if (typeof w.requestIdleCallback === "function") {
            const id = w.requestIdleCallback(fire, { timeout: timeoutMs })
            return () => {
                if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(id)
            }
        }
        // Fallback for Safari (no rIC) — use a timeout that fires past the
        // typical paint+hydrate window.
        const id = window.setTimeout(fire, Math.min(timeoutMs, 2500))
        return () => window.clearTimeout(id)
    }, [timeoutMs])

    return ready
}
