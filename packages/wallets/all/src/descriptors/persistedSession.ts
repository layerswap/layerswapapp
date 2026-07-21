/**
 * Helpers for descriptor `hasPersistedSession` probes. Each descriptor
 * inlines its chain SDK's storage-key literal (importing the SDK's constant
 * would drag the SDK into the entry chunk — the whole point of descriptors
 * is deferring that). Keep the literals in sync with the keys noted at each
 * call site.
 */
export function hasStorageKey(key: string): boolean {
    if (typeof window === 'undefined') return false
    try {
        return window.localStorage.getItem(key) !== null
    } catch {
        return false
    }
}

export function readStorageJson(key: string): unknown {
    if (typeof window === 'undefined') return undefined
    try {
        const raw = window.localStorage.getItem(key)
        return raw ? JSON.parse(raw) : undefined
    } catch {
        return undefined
    }
}
