import type { QrCodeState } from "./types"

export type DisplayUriListener = (uri: string) => void

/**
 * Minimal contract for anything that emits a WalletConnect `display_uri`.
 * The Solana adapter implements this natively; for EVM we adapt wagmi's
 * one-shot `provider.once('display_uri', ...)` into the same shape.
 */
export type DisplayUriSource = {
    onDisplayUri(listener: DisplayUriListener): () => void
}

export type SubscribeDisplayUriParams = {
    source: DisplayUriSource
    /** Converts the raw `wc:` URI into a wallet-specific deep link (mobile). */
    resolveURI?: (uri: string) => string | undefined
    /** On mobile with a resolvable deep-link, the helper navigates away instead of emitting `onQr`. */
    isMobilePlatform: boolean
    /** Called with each QR state transition (`loading` is emitted by the caller, not here). */
    onQr: (state: QrCodeState) => void
}

/**
 * Bridges a `display_uri` event source to the shared QR state shape, with
 * mobile deep-link fallback. Returns an unsubscribe function.
 *
 * The caller is expected to have already emitted `{ state: 'loading' }` before
 * invoking this helper.
 */
export function subscribeDisplayUri(params: SubscribeDisplayUriParams): () => void {
    const { source, resolveURI, isMobilePlatform, onQr } = params

    return source.onDisplayUri((uri: string) => {
        const deepLink = resolveURI ? resolveURI(uri) : undefined

        if (isMobilePlatform && deepLink) {
            window.location.href = deepLink
            return
        }

        onQr({ state: 'fetched', value: uri, deepLink })
    })
}
