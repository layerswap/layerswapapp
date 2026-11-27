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
 * Re-runs a deduplicated wallet initializer each time the connect modal opens,
 * including when subscribing to an already-open modal. After the chunk-level
 * retry is exhausted, recovery waits for the next opening. Cleanup removes the
 * subscription; initialization already in flight continues.
 */
export function retryInitOnModalOpen(init: () => Promise<void>): () => void {
    let wasOpen = false

    const syncModal = () => {
        const open = connectModalStore.getSnapshot().isWalletModalOpen
        const opened = open && !wasOpen
        wasOpen = open
        if (opened) {
            // Initializers report failures; the next opening can try again.
            init().catch(() => {})
        }
    }

    syncModal()
    return connectModalStore.subscribe(syncModal)
}
