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
 * so the user can recover from a failed load without a reload. Within one
 * opening, a load that fails on a chunk is retried automatically at most once.
 * Subscribing while the modal is already open joins that opening. The returned
 * cleanup stops everything, including retries for loads still in flight.
 */
export function retryInitOnModalOpen(init: () => Promise<void>): () => void {
    let subscribed = true
    let openingId = 0
    let wasOpen = false
    const isModalOpen = () => connectModalStore.getSnapshot().isWalletModalOpen

    const startOpening = () => {
        openingId += 1
        const opening = openingId
        init().catch(error => {
            const sameOpening = opening === openingId && isModalOpen()
            if (subscribed && sameOpening && isChunkLoadError(error)) {
                init().catch(() => {})
            }
        })
    }

    const syncModal = () => {
        const open = isModalOpen()
        if (open && !wasOpen) {
            startOpening()
        }
        wasOpen = open
    }

    syncModal()
    const unsubscribe = connectModalStore.subscribe(syncModal)

    return () => {
        subscribed = false
        unsubscribe()
    }
}
