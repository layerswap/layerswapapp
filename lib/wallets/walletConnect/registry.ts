import { fetchWallets, chainsForNamespace } from "./api"
import { mapWallet } from "./mapWallet"
import type { WalletConnectWalletBase } from "./types"

// Slugified names of wallets to exclude (duplicates / unwanted entries).
const SLUGS_TO_FILTER = ['okx-wallet-1', 'ready']

const SOLANA_MAINNET_CAIP = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'
const SOLANA_DEPRECATED_MAINNET_CAIP = 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ'
const SOLANA_DEVNET_CAIP = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1'
const SOLANA_DEPRECATED_DEVNET_CAIP = 'solana:8E9rvCKLFQia2Y35HXjjpWzj8weVo44K'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export const SOLANA_CAIP_IDS = isSandbox
    ? [SOLANA_DEVNET_CAIP, SOLANA_DEPRECATED_DEVNET_CAIP]
    : [SOLANA_MAINNET_CAIP, SOLANA_DEPRECATED_MAINNET_CAIP]

export type ResolveOptions = {
    namespace?: string
    chainIds?: string[]
    page?: number
    entries?: number
    search?: string
}

export type ResolveResult = {
    wallets: WalletConnectWalletBase[]
    totalCount: number
    nextPage: number | null
}

export async function resolveWalletConnectWallets(opts: ResolveOptions = {}): Promise<ResolveResult> {
    const chains = opts.chainIds?.join(',')
        || (opts.namespace ? chainsForNamespace(opts.namespace) : undefined)

    const response = await fetchWallets({
        page: opts.page ?? 1,
        entries: opts.entries ?? 40,
        chains: chains || undefined,
        search: opts.search,
    })

    const wallets = response.data
        .map(mapWallet)
        .filter(w => !SLUGS_TO_FILTER.includes(w.id))

    return {
        wallets,
        totalCount: response.count,
        nextPage: response.nextPage,
    }
}
