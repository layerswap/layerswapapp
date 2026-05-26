import { fetchWallets, chainsForNamespace } from "./api"
import { mapWallet } from "./mapWallet"
import type { WalletConnectWalletBase } from "./types"

// Slugified names of wallets to exclude (duplicates / unwanted entries).
const SLUGS_TO_FILTER = ['okx-wallet-1', 'ready']

export type ResolveOptions = {
    namespace?: string
    chainIds?: string[]
    page?: number
    entries?: number
    search?: string
    projectId?: string
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
        projectId: opts.projectId || '',
    })

    const wallets = response.data
        .map((wallet) => mapWallet(wallet, opts.projectId || ''))
        .filter(w => !SLUGS_TO_FILTER.includes(w.id))

    return {
        wallets,
        totalCount: response.count,
        nextPage: response.nextPage,
    }
}
