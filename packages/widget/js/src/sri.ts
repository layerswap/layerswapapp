/**
 * Runtime SRI (Subresource Integrity) interceptor.
 *
 * Why this exists: signing the manifest only proves the manifest is
 * authentic. An attacker who controls the CDN can keep our signed
 * manifest unchanged and replace any of the JS chunks it references —
 * the loader would happily execute the tampered code. To close that
 * gap, the manifest carries an SHA-384 hash for every file in the
 * build, and at runtime we attach those hashes to the `integrity`
 * attribute on the script tags the Module Federation runtime creates.
 * The browser does the verification natively; on mismatch it refuses
 * to execute the script, MF reports the load failure, and the error
 * boundary in the host loader catches it.
 *
 * The interception works by patching the `src` property descriptor on
 * `HTMLScriptElement.prototype`. Whenever someone sets `script.src`
 * to a URL under a registered build prefix (origin + build
 * directory, e.g. `https://cdn.example.com/widget/1.5.0-abc123/`), we look
 * up the filename in that build's chunk-hash map and add `integrity`
 * + `crossorigin="anonymous"` to the element before the browser
 * starts fetching. Patch is idempotent and global — install once per
 * page.
 */

type ChunkHashes = Readonly<Record<string, string>>;
type RegistrationOptions = {
    /** Merge non-conflicting hashes into a shared content-addressed prefix. */
    merge?: boolean;
};

// A well-formed SHA-384 SRI value (48 zero bytes → 64 base64 chars) that no
// real chunk can hash to. Used to hard-fail a known-origin script that isn't
// in the manifest. It must be syntactically valid so the browser keeps it in
// the integrity metadata set and enforces it (an unparseable value would be
// dropped, defeating the block).
const UNMATCHABLE_SRI = `sha384-${'A'.repeat(64)}`;

let installed = false;
// Keyed by build prefix — origin + build directory with a trailing slash
// (e.g. `https://cdn.example.com/widget/1.5.0-abc123/`). Keying by prefix instead of
// origin lets several builds on the same origin coexist: promoting a channel
// or spinning up a second loader instance registers a new prefix without
// clobbering the hashes an older build's still-pending lazy chunks need.
const prefixHashes = new Map<string, ChunkHashes>();

/**
 * Register chunk hashes for a build prefix. The argument is typically the
 * build's remoteEntry URL — its basename is stripped, so registration keys on
 * the build directory (a bare origin falls back to `origin + '/'`). Start
 * intercepting script URLs so Module Federation chunks automatically receive
 * their SRI hash; the interceptor is installed only once per page. Registration
 * is idempotent for the same prefix and hash map; a conflicting map for an
 * immutable prefix is rejected.
 * Pass `{ merge: true }` only for a shared content-addressed namespace: new
 * filenames are added, while a duplicate filename with another hash is
 * rejected as a collision.
 * Other builds' registrations are untouched. Registrations intentionally live
 * for the lifetime of the page: the global Module Federation runtime can
 * request lazy chunks after an individual widget root has unmounted.
 */
export function registerChunkHashes(
    originPrefix: string,
    hashes: ChunkHashes,
    { merge = false }: RegistrationOptions = {},
): void {
    const prefix = normalizePrefix(originPrefix);
    const existing = prefixHashes.get(prefix);
    if (existing && merge) {
        for (const [filename, hash] of Object.entries(hashes)) {
            const registeredHash = existing[filename];
            if (registeredHash && registeredHash !== hash) {
                throw new Error(
                    `[layerswap/widget-js] conflicting SRI hash for content-addressed asset: ${filename}`,
                );
            }
        }
        prefixHashes.set(prefix, Object.freeze({ ...existing, ...hashes }));
    } else if (existing && !sameChunkHashes(existing, hashes)) {
        // Build prefixes are immutable. Rebinding one to different signed
        // bytes would make already-loaded runtimes and later lazy requests
        // disagree about which build owns the URL, so fail closed.
        throw new Error(`[layerswap/widget-js] conflicting SRI maps for immutable prefix: ${prefix}`);
    }
    if (!existing) prefixHashes.set(prefix, Object.freeze({ ...hashes }));
    if (!installed) installScriptSrcInterceptor();
}

function sameChunkHashes(a: ChunkHashes, b: ChunkHashes): boolean {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length
        && aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]);
}

function normalizePrefix(urlOrPrefix: string): string {
    try {
        const url = new URL(urlOrPrefix);
        // Directory portion of the pathname: strip the basename, keep the
        // trailing slash (`/widget/1.5.0/remoteEntry.js` → `/widget/1.5.0/`).
        const dir = url.pathname.replace(/[^/]*$/, '');
        return url.origin + (dir || '/');
    } catch {
        return urlOrPrefix.replace(/\/+$/, '') + '/';
    }
}

/**
 * Nearest registered path ancestor for the script URL. Walking ancestors
 * gives the longest matching prefix through direct map lookups instead of
 * scanning every historical build registered on the page.
 */
function findRegisteredPrefix(url: URL): string | undefined {
    let pathname = url.pathname;
    while (true) {
        const slash = pathname.lastIndexOf('/');
        if (slash < 0) return undefined;
        const prefix = `${url.origin}${pathname.slice(0, slash + 1)}`;
        if (prefixHashes.has(prefix)) return prefix;
        if (slash === 0) return undefined;
        pathname = pathname.slice(0, slash);
    }
}

function lookupHash(scriptUrl: string): string | undefined {
    const url = safeUrl(scriptUrl);
    if (!url) return undefined;
    const prefix = findRegisteredPrefix(url);
    if (!prefix) return undefined;
    const hashes = prefixHashes.get(prefix);
    if (!hashes) return undefined;
    // Basename-only lookup within the matched build's map. Safe because each
    // registered prefix maps to exactly one Module Federation build, and
    // Rspack outputs that build's chunks with unique filenames.
    const filename = url.pathname.split('/').filter(Boolean).pop() ?? '';
    return hashes[filename];
}

function installScriptSrcInterceptor(): void {
    if (installed) return;
    if (typeof window === 'undefined' || typeof HTMLScriptElement === 'undefined') return;

    // `src` is defined on `HTMLScriptElement.prototype`, not the more general
    // `HTMLElement.prototype` — no fallback needed. If a future environment
    // ever moves it, returning early is the right fail-safe (we'd rather not
    // run with SRI disabled than silently bypass it).
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (!srcDesc || !srcDesc.set || !srcDesc.get) return;

    const origSet = srcDesc.set;
    const origGet = srcDesc.get;

    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: true,
        enumerable: srcDesc.enumerable,
        get() {
            return origGet.call(this);
        },
        set(value: string) {
            applyIntegrityIfKnown(this as HTMLScriptElement, value);
            origSet.call(this, value);
        },
    });

    // Also catch `setAttribute('src', …)` — webpack-style loaders use this
    // in some configurations.
    const origSetAttr = HTMLScriptElement.prototype.setAttribute;
    HTMLScriptElement.prototype.setAttribute = function (name: string, value: string) {
        if (name.toLowerCase() === 'src') {
            applyIntegrityIfKnown(this, value);
        }
        return origSetAttr.call(this, name, value);
    };

    installed = true;
}

function applyIntegrityIfKnown(el: HTMLScriptElement, src: string): void {
    if (!src) return;
    // Skip if the caller already set integrity — respect explicit choices.
    if (el.getAttribute('integrity')) return;
    const hash = lookupHash(src);
    if (!hash) {
        // Unknown chunk under a registered build prefix should be
        // suspicious, but we can't distinguish "MF asked for an unmanifest
        // URL" from "page has its own scripts". So we only refuse for
        // registered prefixes — same-origin scripts outside any registered
        // prefix (and unknown origins) pass through untouched.
        const url = safeUrl(src);
        if (url && findRegisteredPrefix(url) !== undefined) {
            // Registered prefix, unknown chunk → block. Use a syntactically valid
            // SHA-384 digest (correct length, valid base64) that no real
            // content can match. A malformed digest like "sha384-INVALID…"
            // risks being discarded as unparseable by the SRI implementation,
            // which would leave an empty metadata set and let the script run.
            // eslint-disable-next-line no-console
            console.error('[layerswap/widget-js] refusing to load unmanifest chunk:', src);
            el.setAttribute('integrity', UNMATCHABLE_SRI);
            el.setAttribute('crossorigin', 'anonymous');
        }
        return;
    }
    el.setAttribute('integrity', hash);
    el.setAttribute('crossorigin', 'anonymous');
}

function safeUrl(s: string): URL | undefined {
    try {
        return new URL(s, window.location.href);
    } catch {
        return undefined;
    }
}
