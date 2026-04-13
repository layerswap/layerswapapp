import walletsData from "@/public/walletsData.json"
import { resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { pickLatestBy } from "./pickLatestBy"
import type { WalletConnectWalletBase } from "./types"

export const WALLETS_TO_FILTER = [
    "5d9f1395b3a8e848684848dc4147cbd05c8d54bb737eac78fe103901fe6b01a1",
]

const SOLANA_MAINNET_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
const SOLANA_DEPRECATED_MAINNET_CAIP = 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ'
const SOLANA_DEVNET_CAIP = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
const SOLANA_DEPRECATED_DEVNET_CAIP = 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export const SOLANA_CAIP_IDS = isSandbox
    ? [SOLANA_DEVNET_CAIP, SOLANA_DEPRECATED_DEVNET_CAIP]
    : [SOLANA_MAINNET_CAIP, SOLANA_DEPRECATED_MAINNET_CAIP]

const wallets = Object.values(walletsData.listings)

export type ResolveOptions = {
    /** CAIP-2 namespace prefix to match against `chains` (e.g. 'eip155', 'solana'). */
    namespace?: string
    /** Specific CAIP-2 chain IDs to match (at least one must be in the wallet's `chains`). */
    chainIds?: string[]
    /** If true, include wallets that only declare desktop deep-links. */
    includeDesktopOnly?: boolean
}

const toWallet = (wallet: any): WalletConnectWalletBase => {
    const hasBrowserExtension = wallet.injected != null
    const installUrl = hasBrowserExtension ? (wallet.app?.browser ?? wallet.app?.chrome) : undefined
    const isMobileSupported = !!(wallet.mobile?.native || wallet.mobile?.universal)

    return {
        id: wallet.slug,
        name: wallet.name,
        icon: wallet.image_url?.sm,
        rdns: wallet.rdns || undefined,
        mobile: {
            native: wallet.mobile?.native ?? null,
            universal: wallet.mobile?.universal ?? null,
        },
        desktop: wallet.desktop
            ? { native: wallet.desktop.native ?? null, universal: wallet.desktop.universal ?? null }
            : undefined,
        chains: Array.isArray(wallet.chains) ? wallet.chains : [],
        hasBrowserExtension,
        installUrl,
        isMobileSupported,
        order: resolveWalletConnectorIndex(wallet.slug),
        updatedAt: wallet.updatedAt,
    }
}

const passesBaseFilter = (wallet: any, includeDesktopOnly: boolean): boolean => {
    if (!wallet?.name || !wallet?.slug) return false
    if (WALLETS_TO_FILTER.includes(wallet.id)) return false
    const isMobileSupported = !!(wallet.mobile?.native || wallet.mobile?.universal)
    const isDesktopSupported = !!(wallet.desktop?.native || wallet.desktop?.universal)
    if (!isMobileSupported && !(includeDesktopOnly && isDesktopSupported)) return false
    return true
}

const passesNamespaceFilter = (wallet: any, opts: ResolveOptions): boolean => {
    if (!opts.namespace && !opts.chainIds) return true
    const chains: string[] = Array.isArray(wallet.chains) ? wallet.chains : []
    if (opts.chainIds && opts.chainIds.some(id => chains.includes(id))) return true
    if (opts.namespace && chains.some(c => c.startsWith(`${opts.namespace}:`))) return true
    return false
}

export const resolveWalletConnectWallets = (opts: ResolveOptions = {}): WalletConnectWalletBase[] => {
    const includeDesktopOnly = opts.includeDesktopOnly ?? false
    return pickLatestBy(wallets, (c: any) => c.slug)
        .filter((w: any) => passesBaseFilter(w, includeDesktopOnly) && passesNamespaceFilter(w, opts))
        .map(toWallet)
}

// Pre-resolved convenience exports (used by chain-specific wiring).
export const evmWalletConnectWallets = resolveWalletConnectWallets({ namespace: 'eip155' })
export const solanaWalletConnectWallets = resolveWalletConnectWallets({ chainIds: SOLANA_CAIP_IDS })
