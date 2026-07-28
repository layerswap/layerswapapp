import { ExtendedRouteFlags } from "./types";

/**
 * Public, CORS-open endpoint on the canonical bridge deployment that returns the
 * resolved extended-route flags (see `apps/bridge/pages/api/flags.ts`). Served by
 * the SAME deployment that hosts the Polymarket relayer proxy, so the flag state a
 * client reads here always matches the gate it will hit at withdrawal time.
 * Absolute for the same reason as `POLYMARKET_RELAYER_PROXY_URL`: embeds run on
 * third-party origins, so a relative path would resolve against the host page.
 */
export const EXTENDED_ROUTE_FLAGS_URL = 'https://layerswap.io/app/api/flags'

// Deliberately much shorter than a typical API budget: this request runs in
// the same Promise.all as the core settings fetches, so its deadline is the
// most the OPTIONAL flags lookup can keep the widget skeleton visible after
// all required settings are ready. On timeout we return undefined and the
// registry falls back to each provider's `enabledByDefault` (fail-closed for
// credential-bearing routes), so a slow flags endpoint degrades safely.
const FLAGS_FETCH_TIMEOUT_MS = 1_500

/**
 * Fetch the extended-route kill switches for clients with no SSR flag resolution
 * (CDN embeds, deposit integrations). Returns undefined on ANY failure — the
 * registry then falls back to each provider's `enabledByDefault`, which encodes the
 * per-provider fail-open/fail-closed decision (fail-closed for credential-bearing
 * routes like Polymarket).
 */
export async function fetchExtendedRouteFlags(): Promise<ExtendedRouteFlags | undefined> {
    try {
        const res = await fetch(EXTENDED_ROUTE_FLAGS_URL, { signal: AbortSignal.timeout?.(FLAGS_FETCH_TIMEOUT_MS) })
        if (!res.ok) return undefined
        const data = await res.json()
        if (!data || typeof data !== 'object') return undefined
        const flags: ExtendedRouteFlags = {}
        for (const [id, enabled] of Object.entries(data)) {
            if (typeof enabled === 'boolean') flags[id] = enabled
        }
        return flags
    } catch {
        return undefined
    }
}
