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
    /** Operational kill switch — loader refuses to execute when true. */
    killSwitch?: boolean;
    /** Base64-encoded ECDSA P-256 signature over canonical(manifest, signature:null). */
    signature?: string | null;
};

/**
 * Public key (raw P-256 SPKI, base64) used to verify the manifest signature.
 *
 * **TODO:** This is a placeholder generated locally. Before pointing real
 * integrators at this build:
 *   1. Generate the production keypair in a KMS/HSM.
 *   2. Replace this constant with the public key half (export SPKI, base64).
 *   3. Bake into a release of `@layerswap/widget-react` and publish under
 *      SRI-pinned npm. Rotating the key thereafter requires a `widget-react`
 *      version bump (the public key is the trust anchor).
 */
export const PLACEHOLDER_PUBLIC_KEY_SPKI_B64 =
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
 * Canonical serialization for signing: JSON with sorted keys and the
 * `signature` field set to `null`. The signer and the verifier must agree
 * on this exact byte sequence.
 */
export function canonicalize(manifest: Manifest): ArrayBuffer {
    const body: Manifest = { ...manifest, signature: null };
    const sorted = JSON.stringify(body, Object.keys(body).sort());
    return toBytes(sorted);
}

/**
 * Verify the manifest's signature against the baked-in public key.
 * Returns `true` if the signature is valid, `false` otherwise.
 *
 * Returns `false` when `signature` is missing or empty — callers decide
 * whether to enforce verification (the loader treats "missing signature
 * AND verify: true" as a hard failure).
 */
export async function verifyManifest(manifest: Manifest, publicKeyB64: string = PLACEHOLDER_PUBLIC_KEY_SPKI_B64): Promise<boolean> {
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

export async function fetchManifest(manifestUrl: string): Promise<Manifest> {
    let res: Response;
    try {
        res = await fetch(manifestUrl, { cache: 'no-cache' });
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
