/**
 * Manifest format published at `/<channel>/manifest.json` by the CDN.
 *
 * The loader fetches this BEFORE the remote bundle, so we can:
 *   - Roll forward atomically (point `/v1/manifest.json` at a new remoteEntry
 *     without touching the integrator)
 *   - Refuse to load when `killSwitch: true`
 *   - Verify a signature over the manifest body and reject tampered builds
 *
 * The `signature` field is a detached signature over a canonical serialization
 * of the manifest with `signature` itself set to `null`. See `verifyManifest`.
 */
export type Manifest = {
    /** Semver of the build this manifest describes (the `@layerswap/widget` version). */
    version: string;
    /**
     * Major channel this build belongs to, e.g. `"v1"`. Informational — the
     * loader fetches whatever manifest URL it's given; this field lets tooling
     * and humans see which compatibility channel a pinned build came from.
     */
    channel?: string;
    /**
     * Immutable identity of this exact build (`<version>-<gitSha12>`) — names
     * the write-once CDN directory it lives in. Distinct from `version`, which
     * can repeat across builds when non-widget packages change the bytes.
     */
    buildId?: string;
    /** Git commit the build was produced from (provenance — not security-critical). */
    gitSha?: string;
    /** ISO-8601 build timestamp (provenance). */
    builtAt?: string;
    /** ISO-8601 signing timestamp — start of this manifest's validity window. */
    issuedAt?: string;
    /**
     * ISO-8601 end of the manifest's validity window. Replay protection: a
     * signature and SRI prove authenticity and byte integrity but not
     * freshness — without an enforced expiry, an attacker who can replay
     * CDN/R2 responses could serve an older valid build indefinitely,
     * reviving a fixed vulnerability or bypassing a newer kill switch.
     *
     * Availability policy (explicit, so an outage is never a reason to accept
     * an expired security policy): verifying loaders REQUIRE this field and
     * fail closed once `expiresAt` (+5 min clock skew) passes — the widget
     * refuses to load and surfaces `ManifestError('stale')`. The publish
     * pipeline signs a 30-day window (`LAYERSWAP_MANIFEST_TTL_DAYS`) while
     * deploys happen far more often; if the channel ever approaches expiry,
     * re-publishing (re-signing) the same build restores freshness. Already
     *-running pages are unaffected (their code is loaded); only new mounts
     * fail.
     */
    expiresAt?: string;
    /**
     * Absolute or manifest-relative URL to the remoteEntry.js.
     *
     * Kept origin-relative (`"./remoteEntry.js"`) so the same signed bytes work
     * whether the manifest is fetched directly at its immutable version path
     * (`/1.5.0/manifest.json`) or reached via a rolling-channel redirect
     * (`/v1/manifest.json` → 302 → `/1.5.0/manifest.json`). The loader resolves
     * it against the manifest's FINAL (post-redirect) URL — see `resolveSource`.
     */
    remoteEntry: string;
    /**
     * Manifest-relative base URL for content-addressed chunks. When omitted,
     * chunks are expected beside `remoteEntry` for compatibility with older
     * manifests and the local development server.
     */
    assetBase?: string;
    /**
     * Per-file SRI hashes for every JS chunk in the build, keyed by
     * filename (e.g. `"1499.abc12345.js": "sha384-…"`). The loader uses
     * these to set the `integrity` attribute on every `<script>` tag the
     * MF runtime creates for our CDN origin — browser verifies natively
     * and refuses to execute on mismatch. Closes the "swap a chunk while
     * keeping the manifest" attack: the manifest's signed body pins the
     * exact bytes of every downstream file.
     */
    chunks?: Record<string, string>;
    /** Operational kill switch — loader refuses to execute when true. */
    killSwitch?: boolean;
    /** Base64-encoded ECDSA P-256 signature over canonical(manifest, signature:null). */
    signature?: string | null;
};

/**
 * P-256 SPKI public key used to verify manifest signatures (base64-encoded).
 * This is the live trust anchor for all widget deployments — it matches the
 * private key held in CI (`secrets.LAYERSWAP_PRIVATE_KEY_PEM`) and the public
 * half in `apps/widget-cdn/.keys/`. Verification is fully functional with it.
 *
 * Rotating this key requires a version bump of `@layerswap/widget-js`;
 * integrators pin it transitively via npm SRI.
 *
 * Current key: generated 2026-06 (pre-KMS). Before a 1.0 release, regenerate
 * in a KMS/HSM and update this constant plus the GitHub secret
 * `LAYERSWAP_PRIVATE_KEY_PEM`.
 */
export const MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 =
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAESuHFHbltz/hfcY+DzIrLq7Ixc4efHE8SLZdNg0pZZDHTfdwbqLpGk4461EgNranHLWnVsoAbyQ4IyHIVnRAVKw==';

/**
 * Canonical Layerswap CDN manifest URL — the fixed source the loaders always
 * use. Integrators cannot repoint it (it is not a runtime prop); the loader
 * reads it directly. Points at the rolling `v1` channel, so hosts auto-receive
 * forward-compatible widget updates without a redeploy.
 *
 * Currently the Cloudflare Worker's `*.workers.dev` subdomain. When the
 * `cdn.layerswap.io` custom domain is wired in `apps/widget-cdn/worker/
 * wrangler.toml`, update this constant to `https://cdn.layerswap.io/v1/
 * manifest.json` and publish a new `@layerswap/widget-js` — integrators pick
 * up the new origin transitively via npm.
 *
 * The major (`/v1/`) is pinned to this package's major version: when Layerswap
 * cuts a breaking `/v2/`, it ships a new loader major whose default points
 * there. There is no per-call override — pinning an exact build means
 * installing an older package version. (Layerswap's own dev harnesses can
 * repoint the loader at a local server via the internal `__LAYERSWAP_WIDGET_*`
 * globals — see `resolveSource` in `loader.ts`.)
 */
export const DEFAULT_MANIFEST_URL = 'https://layerswap-widget-cdn.layerswapcdn.workers.dev/v1/manifest.json';

const fromB64 = (b64: string): ArrayBuffer => {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
};

const toBytes = (s: string): ArrayBuffer => {
    const u8 = new TextEncoder().encode(s);
    // Copy into a fresh ArrayBuffer so the type is `ArrayBuffer`, not the
    // wider `ArrayBufferLike` Node 24's typings give back from TextEncoder.
    const out = new ArrayBuffer(u8.byteLength);
    new Uint8Array(out).set(u8);
    return out;
};

/**
 * Deterministic JSON: sorts object keys recursively at every level.
 *
 * We must NOT use `JSON.stringify(body, Object.keys(body).sort())` — when the
 * second argument is an array it acts as a property allowlist applied to
 * EVERY nested object, which silently drops every entry of the `chunks` map
 * (its keys are chunk filenames, not top-level field names). That would leave
 * the chunk hashes out of the signed bytes entirely, so a CDN-side chunk swap
 * with a matching rewritten hash would still verify. Sort recursively instead.
 */
function canonicalJSON(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map(canonicalJSON).join(',')}]`;
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const entries = Object.keys(obj)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

/**
 * Canonical serialization for signing: deterministic JSON (keys sorted at
 * every level) with the `signature` field set to `null`. The signer and the
 * verifier must agree on this exact byte sequence.
 */
export function canonicalize(manifest: Manifest): ArrayBuffer {
    const body: Manifest = { ...manifest, signature: null };
    return toBytes(canonicalJSON(body));
}

/**
 * Verify the manifest's signature against the baked-in public key.
 * Returns `true` if the signature is valid, `false` otherwise.
 *
 * Returns `false` when `signature` is missing or empty — callers decide
 * whether to enforce verification (the loader treats "missing signature
 * AND verify: true" as a hard failure).
 */
export async function verifyManifest(manifest: Manifest, publicKeyB64: string = MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64): Promise<boolean> {
    if (!manifest.signature) return false;
    try {
        const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
        if (!subtle) {
            console.warn('[layerswap/widget-js] WebCrypto unavailable — manifest signature cannot be verified');
            return false;
        }
        const key = await subtle.importKey(
            'spki',
            fromB64(publicKeyB64),
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify'],
        );
        const sig = fromB64(manifest.signature);
        const body = canonicalize(manifest);
        return await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sig, body);
    } catch (err) {
        console.warn('[layerswap/widget-js] manifest verification threw:', err);
        return false;
    }
}

/**
 * Resolve a relative or absolute remoteEntry URL against the manifest URL.
 * Lets the manifest say `"remoteEntry": "/v1/remoteEntry.abc.js"` and the
 * loader fetches it from the same origin as the manifest.
 */
export function resolveRemoteEntry(manifestUrl: string, remoteEntry: string): string {
    try {
        return new URL(remoteEntry, manifestUrl).toString();
    } catch {
        return remoteEntry;
    }
}

export class ManifestError extends Error {
    constructor(public readonly reason: 'fetch' | 'parse' | 'signature' | 'kill-switch' | 'stale', message: string) {
        super(message);
        this.name = 'ManifestError';
    }
}

/** Allowance for host/CDN clock disagreement when judging freshness. */
export const MANIFEST_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Judge a manifest's freshness at `nowMs`. Pure — the loader turns non-fresh
 * results into `ManifestError('stale')` when signature verification is on.
 *
 * `missing-expiry` is distinct from `expired` so verifying loaders can reject
 * manifests signed without a validity window: accepting them would let a
 * replayed pre-expiry manifest bypass freshness forever.
 */
export function manifestFreshness(manifest: Manifest, nowMs: number): 'fresh' | 'missing-expiry' | 'expired' {
    if (typeof manifest.expiresAt !== 'string') return 'missing-expiry';
    const expiresMs = Date.parse(manifest.expiresAt);
    if (Number.isNaN(expiresMs)) return 'missing-expiry';
    return nowMs > expiresMs + MANIFEST_CLOCK_SKEW_MS ? 'expired' : 'fresh';
}

/** A fetched manifest plus the URL it was ultimately served from. */
export type FetchedManifest = {
    manifest: Manifest;
    /**
     * The FINAL URL the manifest was served from, after any HTTP redirects.
     * When a rolling channel (`/v1/manifest.json`) 302-redirects to an
     * immutable build (`/1.5.0/manifest.json`), this is the latter — so
     * resolving the relative `remoteEntry` against it anchors the remote (and
     * every chunk it loads) at the immutable version path, not the channel root.
     */
    url: string;
};

/**
 * Fetch and minimally validate the manifest.
 *
 * `allowCache` lets the browser HTTP cache satisfy the request (`cache:
 * 'default'`). Callers pass `false` when signature verification is on so the
 * freshest bytes are checked; with verification off, respecting the CDN's
 * `Cache-Control` avoids a network round-trip on every mount/remount.
 *
 * Returns both the parsed manifest and the post-redirect URL it came from.
 * `fetch` follows redirects by default, so `res.url` reflects the final
 * location; callers MUST resolve `remoteEntry` against that, not the URL they
 * requested, for the rolling-channel redirect to work.
 */
export async function fetchManifest(manifestUrl: string, allowCache = false): Promise<FetchedManifest> {
    let res: Response;
    try {
        res = await fetch(manifestUrl, { cache: allowCache ? 'default' : 'no-cache' });
    } catch (err) {
        throw new ManifestError('fetch', `failed to fetch manifest: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
        throw new ManifestError('fetch', `manifest fetch returned ${res.status}`);
    }
    let json: unknown;
    try {
        json = await res.json();
    } catch (err) {
        throw new ManifestError('parse', `manifest JSON parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!json || typeof json !== 'object' || typeof (json as Manifest).remoteEntry !== 'string') {
        throw new ManifestError('parse', 'manifest is missing required `remoteEntry` field');
    }
    // `res.url` is empty in some non-browser fetch polyfills — fall back to the
    // requested URL so resolution still works (just without redirect-awareness).
    return { manifest: json as Manifest, url: res.url || manifestUrl };
}
