// Stable identity for a wallet name, so the same wallet collapses across sources
// that spell it differently ("Trust" vs "Trust Wallet") instead of showing up as
// duplicate tiles or slipping past dedupe.
export const walletKey = (value: string): string => {
    const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '')
    return base.replace(/wallet$/, '') || base
}
