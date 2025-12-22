import walletsData from "@/public/walletsData.json"

const wallets = Object.values(walletsData.listings)
const solanaWallets = wallets.filter(w => w.injected != null && (w.mobile?.universal || w.mobile?.native) && w.chains?.some(c => c.startsWith("solana:")))

export const isSolanaAdapterSupported = (adapterName: string): boolean => {
    const normalizedAdapterName = adapterName.toLowerCase().trim()

    return solanaWallets.some(wallet => {
        const matchName = (wallet.metadata?.shortName || wallet.slug)?.toLowerCase().trim()
        if (!matchName) return false

        if (normalizedAdapterName === matchName) return true
        if (normalizedAdapterName.includes(matchName)) return true
        if (matchName.includes(normalizedAdapterName)) return true

        return false
    })
}