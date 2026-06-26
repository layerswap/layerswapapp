/**
 * Layerswap widget CDN — Cloudflare Worker edge in front of an R2 bucket.
 *
 * Storage model (set up by `scripts/deploy-r2.mjs`):
 *
 *   R2 bucket
 *   ├── 1.5.0/                 ← immutable, write-once build
 *   │   ├── manifest.json      ← signed; describes this exact build
 *   │   ├── remoteEntry.js
 *   │   └── <name>.<hash>.js   ← content-hashed chunks
 *   ├── 1.5.1/                 ← next release, also immutable
 *   └── channels.json          ← the ONLY mutable object: { "v1": "1.5.0" }
 *
 * This Worker does two things:
 *
 *   1. Rolling channel → 302 redirect. A request for `/v1/manifest.json`
 *      reads `channels.json`, finds the current version for `v1`, and
 *      redirects to `/1.5.0/manifest.json`. The loader follows the redirect
 *      and resolves the relative `remoteEntry` against the FINAL URL, so the
 *      remote and every chunk it loads anchor at the immutable `/1.5.0/` path.
 *      Rollback = flip `channels.json`; it propagates within the redirect's
 *      60s cache window. No rebuild, no re-upload.
 *
 *   2. Immutable artifact serving. Everything under a version directory is
 *      served from R2 with `immutable` caching and permissive CORS (the widget
 *      is fetched cross-origin from integrators' pages, and its chunks load
 *      with `crossorigin="anonymous"` for SRI).
 */

interface Env {
    BUCKET: R2Bucket;
}

const CORS_ORIGIN = '*';
const CHANNELS_KEY = 'channels.json';

// Matches a rolling major channel segment: v1, v2, …
const CHANNEL_RE = /^v\d+$/;

const SECURITY_HEADERS: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
};

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
};

function baseHeaders(extra?: Record<string, string>): Headers {
    const h = new Headers({ ...SECURITY_HEADERS, ...CORS_HEADERS });
    if (extra) for (const [k, v] of Object.entries(extra)) h.set(k, v);
    return h;
}

const CONTENT_TYPES: Record<string, string> = {
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json; charset=utf-8',
    map: 'application/json; charset=utf-8',
};

function contentTypeFor(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: baseHeaders() });
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return new Response('Method Not Allowed', { status: 405, headers: baseHeaders() });
        }

        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/+/, '');
        const segments = path.split('/');
        const first = segments[0] ?? '';

        // The channel pointer is an internal control file — never serve it.
        if (path === CHANNELS_KEY) {
            return new Response('Not Found', { status: 404, headers: baseHeaders() });
        }

        // (1) Rolling channel → 302 to the current immutable version.
        if (CHANNEL_RE.test(first)) {
            const version = await currentVersion(env, first);
            if (!version) {
                return new Response(`Unknown channel: ${first}`, { status: 404, headers: baseHeaders() });
            }
            const rest = segments.slice(1).join('/'); // e.g. "manifest.json"
            const location = `/${version}/${rest}`;
            return new Response(null, {
                status: 302,
                headers: baseHeaders({
                    Location: location,
                    // Short cache so a channel flip (roll-forward or rollback)
                    // is picked up within a minute. The target it points at is
                    // immutable, so this is the only thing that ever goes stale.
                    'Cache-Control': 'public, max-age=60, must-revalidate',
                }),
            });
        }

        // (2) Immutable artifact under a version directory.
        return serveObject(env, path, request.method === 'HEAD');
    },
};

/** Read `channels.json` and return the current version for a major channel. */
async function currentVersion(env: Env, channel: string): Promise<string | null> {
    const obj = await env.BUCKET.get(CHANNELS_KEY);
    if (!obj) return null;
    try {
        const channels = (await obj.json()) as Record<string, string>;
        const v = channels[channel];
        return typeof v === 'string' && v.length > 0 ? v : null;
    } catch {
        return null;
    }
}

async function serveObject(env: Env, key: string, headOnly: boolean): Promise<Response> {
    const object = await env.BUCKET.get(key);
    if (!object) {
        return new Response('Not Found', { status: 404, headers: baseHeaders() });
    }

    // Everything under a version directory is write-once → far-future
    // immutable, whether content-hashed (chunks) or stable-named within the
    // version (manifest.json, remoteEntry.js). The version IS the cache key.
    const headers = baseHeaders({
        'Content-Type': object.httpMetadata?.contentType || contentTypeFor(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: object.httpEtag,
    });
    if (object.size != null) headers.set('Content-Length', String(object.size));

    return new Response(headOnly ? null : object.body, { status: 200, headers });
}
