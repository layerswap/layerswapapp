import type { ComponentType, SVGProps } from 'react'
import {
    MetaMaskIcon,
    WalletConnectIcon,
    RainbowIcon,
    CoinbaseIcon,
    PhantomIcon,
    ArgentIcon,
    ImtblPassportIcon,
    BitGetIcon,
    BrowserWalletIcon,
    BakoSafeIcon,
    FuelIcon,
    FueletIcon,
    SolanaIcon,
    EthereumIcon,
    ArgentXIcon,
    BraavosIcon,
    GlowIcon,
    SolflareIcon,
    TONIcon,
    TonKeeperIcon,
    OpenMaskIcon,
    MyTonWalletIcon,
} from '@/components/Icons/Wallets'
import { resolveWalletIdentity } from '../identity'
import { convertSvgComponentToBase64 } from './convertSvgComponentToBase64'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const ICONS: Record<string, IconComponent> = {
    metamask: MetaMaskIcon,
    walletConnect: WalletConnectIcon,
    rainbow: RainbowIcon,
    coinbase: CoinbaseIcon,
    phantom: PhantomIcon,
    argent: ArgentIcon,
    imtblPassport: ImtblPassportIcon,
    bitget: BitGetIcon,
    browser: BrowserWalletIcon,
    bakoSafe: BakoSafeIcon,
    fuel: FuelIcon,
    fuelet: FueletIcon,
    ethereum: EthereumIcon,
    solana: SolanaIcon,
    argentX: ArgentXIcon,
    braavos: BraavosIcon,
    glow: GlowIcon,
    solflare: SolflareIcon,
    ton: TONIcon,
    tonkeeper: TonKeeperIcon,
    openmask: OpenMaskIcon,
    mytonwallet: MyTonWalletIcon,
}

const cache = new Map<string, string>()

export function getIconByKey(iconKey: string | undefined): string | undefined {
    if (!iconKey) return undefined
    const cached = cache.get(iconKey)
    if (cached) return cached
    const Component = ICONS[iconKey]
    if (!Component) return undefined
    const dataUrl = convertSvgComponentToBase64(Component)
    cache.set(iconKey, dataUrl)
    return dataUrl
}

/**
 * String-only icon lookup for known wallet connectors. Wallet packages can
 * use this to satisfy the `Wallet.icon: string` contract without depending on
 * React themselves — the conversion runs here in the widget, the caller just
 * receives a base64 data URL.
 */
export function getKnownConnectorIconBase64(id: string | undefined): string | undefined {
    if (!id) return undefined
    const identity = resolveWalletIdentity({
        rdns: id.includes('.') ? id : undefined,
        nativeId: id,
        name: id,
    })
    return getIconByKey(identity.catalog?.iconKey)
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
    name?: string
    iconUrl?: string
}): string | undefined {
    if (opts.iconUrl) return normalizeIconSrc(opts.iconUrl)
    if (!opts.id && !opts.name) return undefined
    const identity = resolveWalletIdentity({
        rdns: opts.id?.includes('.') ? opts.id : undefined,
        nativeId: opts.id,
        name: opts.name ?? opts.id,
    })
    return getIconByKey(identity.catalog?.iconKey)
}
