/**
 * Layerswap widget CDN — Cloudflare Worker edge in front of an R2 bucket.
 *
 * Storage model (set up by `scripts/deploy-r2.mjs`):
 *
 *   R2 bucket
 *   ├── 1.5.0-abc123def456/    ← immutable, write-once build (buildId =
 *   │   │                        widget version + git sha, see build-id.mjs)
 *   │   ├── manifest.json      ← signed; describes this exact build
 *   │   ├── remoteEntry.js
 *   ├── 1.5.0-fedcba654321/    ← next build, also immutable
 *   ├── assets/                 ← stable, content-addressed namespace shared
 *   │   └── <name>.<hash>.js      across builds for browser/R2 cache reuse
 *   └── channels.json          ← the ONLY mutable object:
 *                                { "v1": "1.5.0-abc123def456" }
 *
 * This Worker does two things:
 *
 *   1. Rolling channel → 302 redirect. A request for `/v1/manifest.json`
 *      reads `channels.json`, finds the current buildId for `v1`, and
 *      redirects to `/<buildId>/manifest.json`. The loader follows the
 *      redirect and resolves the relative `remoteEntry` against the FINAL
 *      URL, so the remote anchors at the immutable `/<buildId>/` path. Its
 *      runtime loads content-hashed chunks from `/assets/`. Rollback = flip
 *      `channels.json`; it propagates within the redirect's 60s cache window.
 *
 *   2. Immutable artifact serving. Everything under a build directory is
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
// Keep in sync with scripts/build-id.mjs. Build IDs are one safe route
// segment and can never shadow a rolling channel or the shared asset prefix.
const BUILD_ID_RE = /^(?!v\d+$)(?!assets$)[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/;

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

        // (1) Rolling channel → 302 to the current immutable build.
        if (CHANNEL_RE.test(first)) {
            const buildId = await currentBuildId(env, first);
            if (!buildId) {
                return new Response(`Unknown channel: ${first}`, { status: 404, headers: baseHeaders() });
            }
            const rest = segments.slice(1).join('/'); // e.g. "manifest.json"
            const location = `/${buildId}/${rest}`;
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

        // (2) Immutable artifact under a build directory.
        return serveObject(env, path, request.method === 'HEAD');
    },
};

/** Read `channels.json` and return the current buildId for a major channel. */
async function currentBuildId(env: Env, channel: string): Promise<string | null> {
    const obj = await env.BUCKET.get(CHANNELS_KEY);
    if (!obj) return null;
    try {
        const channels = (await obj.json()) as Record<string, unknown>;
        const v = channels[channel];
        return typeof v === 'string' && BUILD_ID_RE.test(v) ? v : null;
    } catch {
        return null;
    }
}

async function serveObject(env: Env, key: string, headOnly: boolean): Promise<Response> {
    const object = await env.BUCKET.get(key);
    if (!object) {
        return new Response('Not Found', { status: 404, headers: baseHeaders() });
    }

    // Build directories are write-once and /assets/ keys are content-hashed,
    // so every externally served object is immutable.
    const headers = baseHeaders({
        'Content-Type': object.httpMetadata?.contentType || contentTypeFor(key),
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: object.httpEtag,
    });
    if (object.size != null) headers.set('Content-Length', String(object.size));

    return new Response(headOnly ? null : object.body, { status: 200, headers });
}
