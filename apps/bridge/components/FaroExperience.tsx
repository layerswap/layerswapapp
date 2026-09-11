import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { captureEvent } from '../lib/faro'
import { createEngagementClock } from '../lib/faro-engagement'

export default function FaroExperience() {
    const { pathname } = useRouter()
    useEffect(() => {
        let disposed = false
        const pageViewId = crypto.randomUUID()
        const clock = createEngagementClock(() => performance.now())
        let sequence = 0
        let started = false
        const context = { page_view_id: pageViewId, route: pathname }
        const flush = () => {
            const activeMs = clock.flush()
            if (started && activeMs > 0) captureEvent('browser_experience', { ...context, step: 'engagement', active_ms: activeMs, sequence: ++sequence })
        }
        const visibility = () => { clock.visibility(document.visibilityState === 'visible' && document.hasFocus()); flush() }
        const activity = () => clock.activity()
        const hide = () => { clock.visibility(false); flush() }
        visibility()
        // StrictMode's simulated mount must not manufacture an extra page view.
        queueMicrotask(() => {
            if (!disposed) {
                started = true
                captureEvent('browser_experience', { ...context, step: 'page_viewed' })
            }
        })
        const interval = window.setInterval(flush, 60_000)
        document.addEventListener('visibilitychange', visibility)
        window.addEventListener('focus', visibility)
        window.addEventListener('blur', visibility)
        window.addEventListener('pagehide', hide)
        window.addEventListener('pageshow', visibility)
        for (const name of ['pointerdown', 'keydown', 'scroll']) document.addEventListener(name, activity, { passive: true, capture: true })
        return () => {
            disposed = true
            hide()
            clearInterval(interval)
            document.removeEventListener('visibilitychange', visibility)
            window.removeEventListener('focus', visibility)
            window.removeEventListener('blur', visibility)
            window.removeEventListener('pagehide', hide)
            window.removeEventListener('pageshow', visibility)
            for (const name of ['pointerdown', 'keydown', 'scroll']) document.removeEventListener(name, activity, true)
        }
    }, [pathname])
    return null
}
