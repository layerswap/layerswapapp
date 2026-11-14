const CHUNK_RETRY_DELAY_MS = 500

/** Retry a transient Webpack chunk failure once, before giving up to the caller. */
export async function retryChunkLoad<T>(load: () => Promise<T>): Promise<T> {
    try {
        return await load()
    } catch (error) {
        if (
            typeof error !== 'object'
            || error === null
            || !('name' in error)
            || error.name !== 'ChunkLoadError'
        ) {
            throw error
        }

        // Keep retries at module-loading boundaries, before adapter registration
        // or wallet requests. Re-running those operations could duplicate effects.
        await new Promise<void>(resolve => setTimeout(resolve, CHUNK_RETRY_DELAY_MS))
        return load()
    }
}
