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
 * boundary in `LayerswapWidget` catches it.
 *
 * The interception works by patching the `src` property descriptor on
 * `HTMLScriptElement.prototype`. Whenever someone sets `script.src`
 * to a URL whose origin is our CDN, we look up the filename in the
 * chunk-hash map and add `integrity` + `crossorigin="anonymous"` to
 * the element before the browser starts fetching. Patch is idempotent
 * and global — install once per page.
 */

type ChunkHashes = Record<string, string>;

let installed = false;
const originHashes = new Map<string, ChunkHashes>();

/**
 * Register chunk hashes for a CDN origin. If the SRI patch hasn't
 * been installed yet, install it. Idempotent — calling twice for the
 * same origin just replaces the map (e.g. on channel switch).
 */
export function registerChunkHashes(originPrefix: string, hashes: ChunkHashes): void {
    originHashes.set(normalizeOrigin(originPrefix), hashes);
    if (!installed) installScriptSrcInterceptor();
}

function normalizeOrigin(urlOrOrigin: string): string {
    try {
        return new URL(urlOrOrigin).origin;
    } catch {
        return urlOrOrigin.replace(/\/+$/, '');
    }
}

function lookupHash(scriptUrl: string): string | undefined {
    let url: URL;
    try {
        url = new URL(scriptUrl, window.location.href);
    } catch {
        return undefined;
    }
    const hashes = originHashes.get(url.origin);
    if (!hashes) return undefined;
    const filename = url.pathname.split('/').filter(Boolean).pop() ?? '';
    return hashes[filename];
}

function installScriptSrcInterceptor(): void {
    if (installed) return;
    if (typeof window === 'undefined' || typeof HTMLScriptElement === 'undefined') return;

    const proto = HTMLScriptElement.prototype as unknown as Record<string, unknown>;
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')
        || Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'src');
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
        // Unknown chunk for a known origin should be suspicious, but we
        // can't distinguish "MF asked for an unmanifest URL" from "page
        // has its own scripts". So we only refuse for known origins —
        // unknown origins pass through untouched.
        const url = safeUrl(src);
        if (url && originHashes.has(url.origin)) {
            // Known origin, unknown chunk → block.
            // eslint-disable-next-line no-console
            console.error('[layerswap/widget-react] refusing to load unmanifest chunk:', src);
            el.setAttribute('integrity', 'sha384-INVALID-UNMANIFEST-CHUNK');
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
