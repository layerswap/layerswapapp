// Object identity links observations of the same thrown failure. Never infer a
// shared incident from matching text, a session ID, or a nearby timestamp.
const occurrences = new WeakMap<object, string>()

export function getErrorOccurrenceId(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined
    const chain: object[] = []
    let current: unknown = error
    let id: string | undefined
    while (current && typeof current === 'object' && chain.length < 8 && !chain.includes(current)) {
        chain.push(current)
        id = occurrences.get(current)
        if (id) break
        try { current = (current as { cause?: unknown }).cause }
        catch { break }
    }
    id ??= typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    for (const item of chain) occurrences.set(item, id)
    return id
}
