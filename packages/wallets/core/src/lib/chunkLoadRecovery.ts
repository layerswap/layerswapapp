import { connectModalStore } from './walletConnect/connectModalStore'

const CHUNK_RETRY_DELAY_MS = 500

export function isChunkLoadError(error: unknown): boolean {
    return typeof error === 'object'
        && error !== null
        && 'name' in error
        && error.name === 'ChunkLoadError'
}

/** Retry a transient Webpack chunk failure once, before giving up to the caller. */
export async function retryChunkLoad<T>(load: () => Promise<T>): Promise<T> {
    try {
        return await load()
    } catch (error) {
        if (!isChunkLoadError(error)) {
            throw error
        }

        // Keep retries at module-loading boundaries, before adapter registration
        // or wallet requests. Re-running those operations could duplicate effects.
        await new Promise<void>(resolve => setTimeout(resolve, CHUNK_RETRY_DELAY_MS))
        return load()
    }
}

/**
 * Re-runs a deduplicated wallet initializer whenever the connect modal is
 * open, so the user can recover from a failed load without a reload. If a
 * load is still in flight and then fails on a chunk while the modal stays
 * open, it is retried once more. The returned cleanup stops both.
 */
export function retryInitOnModalOpen(init: () => Promise<void>): () => void {
    let subscribed = true
    const isModalOpen = () => connectModalStore.getSnapshot().isWalletModalOpen

    const unsubscribe = connectModalStore.subscribe(() => {
        if (!isModalOpen()) {
            return
        }
        init().catch(error => {
            if (subscribed && isModalOpen() && isChunkLoadError(error)) {
                init().catch(() => {})
            }
        })
    })

    return () => {
        subscribed = false
        unsubscribe()
    }
}
