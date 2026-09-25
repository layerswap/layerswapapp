// Object identity links observations of the same thrown failure. Never infer a
// shared incident from matching text, a session ID, or a nearby timestamp.
import { createRandomId } from './randomId'

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
        try { current = Object.getOwnPropertyDescriptor(current, 'cause')?.value }
        catch { break }
    }
    id ??= createRandomId()
    for (const item of chain) occurrences.set(item, id)
    return id
}
