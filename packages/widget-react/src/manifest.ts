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
    /** Semver of the build this manifest describes. */
    version: string;
    /** Absolute or manifest-relative URL to the remoteEntry.js. */
    remoteEntry: string;
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
 * Rotating this key requires a version bump of `@layerswap/widget-react`;
 * integrators pin it transitively via npm SRI.
 *
 * Current key: generated 2026-06 (pre-KMS). Before a 1.0 release, regenerate
 * in a KMS/HSM and update this constant plus the GitHub secret
 * `LAYERSWAP_PRIVATE_KEY_PEM`.
 */
export const MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64 =
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEtrU5cbU2kkaqwBPLusROxy1lhbQDTKt9kqJ5z5ngnOlN2xZQzAiHlKLufz5Nlzuf2FpkJX0L+kbGKm0sKn1pJQ==';

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
            console.warn('[layerswap/widget-react] WebCrypto unavailable — manifest signature cannot be verified');
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
        console.warn('[layerswap/widget-react] manifest verification threw:', err);
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
    constructor(public readonly reason: 'fetch' | 'parse' | 'signature' | 'kill-switch', message: string) {
        super(message);
        this.name = 'ManifestError';
    }
}

/**
 * Fetch and minimally validate the manifest.
 *
 * `allowCache` lets the browser HTTP cache satisfy the request (`cache:
 * 'default'`). Callers pass `false` when signature verification is on so the
 * freshest bytes are checked; with verification off, respecting the CDN's
 * `Cache-Control` avoids a network round-trip on every mount/remount.
 */
export async function fetchManifest(manifestUrl: string, allowCache = false): Promise<Manifest> {
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
    return json as Manifest;
}
