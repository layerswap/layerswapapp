// Normalized key for matching the same wallet across sources whose names differ
// slightly (e.g. "Trust" vs "Trust Wallet"): lowercase, strip non-alphanumerics
// and a trailing "wallet". Falls back to the un-stripped base when stripping the
// trailing "wallet" would empty the key (e.g. a wallet literally named "Wallet"),
// so unrelated wallets can never collapse onto an empty key.
export const walletKey = (value: string): string => {
    const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '')
    return base.replace(/wallet$/, '') || base
}
