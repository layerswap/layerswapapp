import { BLOCKED_REGISTRY_SLUGS } from "@/lib/wallets/catalog"
import { fetchWallets, chainsForNamespace } from "./api"
import { mapWallet } from "./mapWallet"
import type { WalletConnectWalletBase } from "./types"

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
    const projectId = opts.projectId || '6113382c2e587bff00e2b5c3d68531f3'
    const response = await fetchWallets({
        page: opts.page ?? 1,
        entries: opts.entries ?? 40,
        chains: chains || undefined,
        search: opts.search,
        projectId,
    })

    const wallets = response.data
        .map((wallet) => mapWallet(wallet, projectId))
        .filter(w => !BLOCKED_REGISTRY_SLUGS.includes(w.slug))

    return {
        wallets,
        totalCount: response.count,
        nextPage: response.nextPage,
    }
}
