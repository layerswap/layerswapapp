import type { ServerResponse } from 'http';

export function setSettingsResponseHeaders(res: ServerResponse, available: boolean, cacheSuccess = true) {
    if (!available) {
        // A failed settings fetch must not replace a healthy page in the CDN.
        res.statusCode = 503;
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('Retry-After', '15');
        return;
    }

    // Swap details contain swap-specific data and must remain uncached.
    if (!cacheSuccess) {
        res.setHeader('Cache-Control', 'private, no-store');
        return;
    }

    // Vercel retains the successful page for at most five minutes beyond its
    // freshness window if revalidation fails. Never extend this with a 200
    // maintenance response. https://vercel.com/docs/caching/cache-control-headers
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60, stale-if-error=300');
}
