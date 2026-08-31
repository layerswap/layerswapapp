const CACHE_NAME = 'wallet-registry-v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const TIMESTAMP_HEADER = 'x-cached-at'

export async function readRegistryCache(url: string): Promise<unknown | null> {
    try {
        if (typeof caches === 'undefined') return null
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(url)
        if (!cached) return null
        const cachedAt = Number(cached.headers.get(TIMESTAMP_HEADER))
        if (!Number.isFinite(cachedAt) || Date.now() - cachedAt > CACHE_TTL_MS) return null
        return await cached.json()
    } catch {
        return null
    }
}

export async function writeRegistryCache(url: string, data: unknown): Promise<void> {
    try {
        if (typeof caches === 'undefined') return
        const cache = await caches.open(CACHE_NAME)
        await cache.put(url, new Response(JSON.stringify(data), {
            headers: {
                'content-type': 'application/json',
                [TIMESTAMP_HEADER]: String(Date.now()),
            },
        }))
    } catch {
    }
}
