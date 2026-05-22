import type { ComponentType, SVGProps } from 'react'
import {
    MetaMaskIcon,
    WalletConnectIcon,
    BitKeepIcon,
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
import { convertSvgComponentToBase64 } from './convertSvgComponentToBase64'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const KNOWN: Record<string, IconComponent> = {
    // EVM
    metamask: MetaMaskIcon,
    'io.metamask': MetaMaskIcon,
    metamasksdk: MetaMaskIcon,
    walletconnect: WalletConnectIcon,
    rainbow: RainbowIcon,
    'app.rainbow': RainbowIcon,
    bitkeep: BitKeepIcon,
    bitget: BitGetIcon,
    coinbasewalletsdk: CoinbaseIcon,
    phantom: PhantomIcon,
    'app.phantom': PhantomIcon,
    'ready (formerly argent)': ArgentIcon,
    'com.immutable.passport': ImtblPassportIcon,
    injected: BrowserWalletIcon,
    // Fuel
    'bako safe': BakoSafeIcon,
    'fuel wallet': FuelIcon,
    'fuelet wallet': FueletIcon,
    'ethereum wallets': EthereumIcon,
    'solana wallets': SolanaIcon,
    // Starknet
    argentx: ArgentXIcon,
    braavos: BraavosIcon,
    // SVM
    glow: GlowIcon,
    solflare: SolflareIcon,
    // TON
    ton: TONIcon,
    tonkeeper: TonKeeperIcon,
    openmask: OpenMaskIcon,
    mytonwallet: MyTonWalletIcon,
}

const cache = new Map<string, string>()

/**
 * String-only icon lookup for known wallet connectors. Wallet packages can
 * use this to satisfy the `Wallet.icon: string` contract without depending on
 * React themselves — the conversion runs here in the widget, the caller just
 * receives a base64 data URL.
 */
export function getKnownConnectorIconBase64(id: string | undefined): string | undefined {
    if (!id) return undefined
    const key = id.toLowerCase()
    const cached = cache.get(key)
    if (cached) return cached
    const Component = KNOWN[key]
    if (!Component) return undefined
    const dataUrl = convertSvgComponentToBase64(Component)
    cache.set(key, dataUrl)
    return dataUrl
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
    if (opts.iconUrl) return opts.iconUrl
    return getKnownConnectorIconBase64(opts.id)
}
