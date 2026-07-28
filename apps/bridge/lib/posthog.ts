import type { PostHog } from 'posthog-js'

// posthog-js DROPS `capture()` calls made before `init()` — it does not queue
// them (verified in 1.390.x: `uninitializedWarning` returns without
// enqueuing). Since `_app.js` defers init to browser idle time, any capture
// fired during first paint (the first $pageview, the 404 event) must be
// parked until init completes. This module is that ordering point: `capture`
// awaits a promise that `_app.js` resolves right after `posthog.init()`.
//
// Importing this module pulls in no posthog runtime code (type-only import),
// so the SDK still stays out of every eager chunk.

let resolveReady: (client: PostHog | null) => void = () => { }
const ready = new Promise<PostHog | null>((resolve) => { resolveReady = resolve })

/**
 * Called once by `_app.js`: with the initialized client after `posthog.init()`,
 * or with `null` when analytics is disabled (no key configured) so pending
 * captures are released instead of leaking as forever-pending promises.
 */
export function markPostHogReady(client: PostHog | null) {
    resolveReady(client)
}

/**
 * Drop-in replacement for `posthog.capture()` that waits for the deferred
 * init. Events fired before init are delivered once it completes; when
 * analytics is disabled they are discarded, matching posthog's own behavior.
 */
export function capture(event: string, properties?: Record<string, unknown>) {
    void ready.then(client => client?.capture(event, properties))
}
