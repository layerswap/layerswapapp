/**
 * Probe helpers for descriptor `hasPersistedSession`. Storage-key literals
 * are inlined at each call site — importing an SDK's key constant would drag
 * in the SDK that descriptors exist to defer.
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
