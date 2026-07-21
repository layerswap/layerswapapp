import {
    MetaMaskIconBase64,
    WalletConnectIconBase64,
    BitKeepIconBase64,
    RainbowIconBase64,
    CoinbaseIconBase64,
    PhantomIconBase64,
    ArgentIconBase64,
    ImtblPassportIconBase64,
    BitGetIconBase64,
    BrowserWalletIconBase64,
    BakoSafeIconBase64,
    FuelIconBase64,
    FueletIconBase64,
    SolanaIconBase64,
    EthereumIconBase64,
    ArgentXIconBase64,
    BraavosIconBase64,
    GlowIconBase64,
    SolflareIconBase64,
    TONIconBase64,
    TonKeeperIconBase64,
    OpenMaskIconBase64,
    MyTonWalletIconBase64,
} from './iconStrings'

const KNOWN: Record<string, string> = {
    // EVM
    metamask: MetaMaskIconBase64,
    'io.metamask': MetaMaskIconBase64,
    metamasksdk: MetaMaskIconBase64,
    walletconnect: WalletConnectIconBase64,
    rainbow: RainbowIconBase64,
    'app.rainbow': RainbowIconBase64,
    bitkeep: BitKeepIconBase64,
    bitget: BitGetIconBase64,
    'bitget wallet': BitGetIconBase64,
    bitgettonwallet: BitGetIconBase64,
    coinbasewalletsdk: CoinbaseIconBase64,
    phantom: PhantomIconBase64,
    'app.phantom': PhantomIconBase64,
    'ready (formerly argent)': ArgentIconBase64,
    'com.immutable.passport': ImtblPassportIconBase64,
    injected: BrowserWalletIconBase64,
    // Fuel
    'bako safe': BakoSafeIconBase64,
    'fuel wallet': FuelIconBase64,
    'fuelet wallet': FueletIconBase64,
    'ethereum wallets': EthereumIconBase64,
    'solana wallets': SolanaIconBase64,
    // Starknet
    argentx: ArgentXIconBase64,
    braavos: BraavosIconBase64,
    // SVM
    glow: GlowIconBase64,
    solflare: SolflareIconBase64,
    // TON
    ton: TONIconBase64,
    tonkeeper: TonKeeperIconBase64,
    openmask: OpenMaskIconBase64,
    mytonwallet: MyTonWalletIconBase64,
}

/**
 * String-only icon lookup for known wallet connectors. Wallet packages can
 * use this to satisfy the `Wallet.icon: string` contract without depending on
 * React themselves — the caller just receives a base64 data URL.
 */
export function getKnownConnectorIconBase64(id: string | undefined): string | undefined {
    if (!id) return undefined
    return KNOWN[id.toLowerCase()]
}

/**
 * Normalize an icon value into something usable as an `<img src>`.
 *
 * Some wallet adapters — notably Wallet Standard wallets surfaced for Solana
 * (e.g. MetaMask, Backpack) — expose `icon` as raw inline SVG markup instead
 * of the spec-required `data:` URI. Handed straight to an `<img src>` the
 * browser treats the markup as a relative URL and fires a bogus request to
 * `/<svg ...>`. Wrap raw SVG/XML markup into a data URI; pass anything that
 * already looks like a URL (`data:`, `http(s):`, `blob:`, a path) through
 * untouched.
 */
export function normalizeIconSrc(icon: string | undefined): string | undefined {
    if (!icon) return undefined
    const trimmed = icon.trim()
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
        const base64 = btoa(encodeURIComponent(trimmed).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
        return `data:image/svg+xml;base64,${base64}`
    }
    return icon
}

/**
 * Resolve a wallet icon by trying, in order: an explicit URL, the known
 * connector overrides, then undefined (widget falls back to a generative
 * AddressIcon based on the wallet address).
 */
export function resolveWalletIconString(opts: {
    id?: string
    iconUrl?: string
}): string | undefined {
    if (opts.iconUrl) return normalizeIconSrc(opts.iconUrl)
    return getKnownConnectorIconBase64(opts.id)
}
