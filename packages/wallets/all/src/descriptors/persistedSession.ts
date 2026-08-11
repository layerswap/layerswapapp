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

/**
 * True when any localStorage key matches. For SDKs that namespace their session
 * flag per connector (bigmi writes `bigmi.<connectorId>.connected`), where the
 * exact key isn't knowable without importing the connector ids from the SDK
 * this probe exists to avoid loading.
 */
export function hasStorageKeyMatching(pattern: RegExp): boolean {
    if (typeof window === 'undefined') return false
    try {
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i)
            if (key && pattern.test(key)) return true
        }
        return false
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
