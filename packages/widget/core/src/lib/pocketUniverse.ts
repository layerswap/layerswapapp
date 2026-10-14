export function detectPocketUniverse(): boolean {
    if (typeof window === 'undefined') return false
    const ownValue = (value: unknown, key: string) => Object.getOwnPropertyDescriptor(value ?? {}, key)?.value
    try {
        const ethereum = Reflect.get(window, 'ethereum')
        if (ethereum?.isPocketUniverse === true || ethereum?.providers?.some(provider => provider?.isPocketUniverse === true)) return true
    } catch {}
    const seenLoaders = new Set<object>()
    for (const key of Object.getOwnPropertyNames(window)) {
        if (!key.startsWith('parcelRequire')) continue
        try {
            let loader = ownValue(window, key)
            while (typeof loader === 'function' && !seenLoaders.has(loader)) {
                seenLoaders.add(loader)
                if (ownValue(loader, 'isParcelRequire') !== true) break
                const modules = Object.values(Object.getOwnPropertyDescriptors(ownValue(loader, 'cache') ?? {}))
                const exports = modules.flatMap(module => Object.getOwnPropertyNames(ownValue(module.value, 'exports') ?? {}))
                if (exports.includes('addPocketUniverseProxy') && exports.includes('applyFeeModifications')) return true
                loader = ownValue(loader, 'parent')
            }
        } catch {}
    }
    return false
}
