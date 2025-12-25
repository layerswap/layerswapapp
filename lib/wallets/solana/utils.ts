import walletsData from "@/public/walletsData.json"
const wallets = Object.values(walletsData.listings)

const resolveSolanaWallets = () => {
    return pickLatestBy(
        wallets,
        c => c.slug
    ).filter(w =>
        w.injected != null &&
        (w.mobile?.universal || w.mobile?.native) &&
        w.chains?.some(c => c.startsWith("solana:"))
    ).map(wallet => ({
        name: wallet.name,
        shortName: wallet.metadata?.shortName || wallet.slug
    }))
}

export const isSolanaAdapterSupported = (adapterName: string): boolean => {
    const normalizedAdapterName = adapterName.toLowerCase().trim()
    const solanaWalletConnectWallets = resolveSolanaWallets()
    return solanaWalletConnectWallets.some(wallet => {
        const matchName = wallet.shortName?.toLowerCase().trim()
        if (!matchName) return false

        if (normalizedAdapterName === matchName) return true
        if (normalizedAdapterName.includes(matchName)) return true
        if (matchName.includes(normalizedAdapterName)) return true

        return false
    })
}
function pickLatestBy<T>(
    connectors: T[],
    keyFn: (c: T) => string
): T[] {
    const map = new Map<string, T>();
    for (const c of connectors) {
        const key = keyFn(c);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, c);
        } else {
            const a = new Date((existing as any).updatedAt);
            const b = new Date((c as any).updatedAt);
            if (b > a) {
                map.set(key, c);
            }
        }
    }
    return Array.from(map.values());
}