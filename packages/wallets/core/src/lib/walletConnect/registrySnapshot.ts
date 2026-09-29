import { walletKey } from '@/lib/walletKey'
import { chainsForNamespace, fetchWallets, type Web3ModalWallet } from './api'
import { mapWallet } from './mapWallet'
import { SLUGS_TO_FILTER } from '@/constants'

export const WALLET_REGISTRY_BATCH_LIMIT = 100

const SNAPSHOT_NAMESPACES = ['eip155', 'solana']
const SNAPSHOT_PAGE_SIZE = 100

export type WalletRegistryBatchResponse = { wallets: Web3ModalWallet[] }
export type { Web3ModalWallet } from './api'

export async function fetchRegistrySnapshot(projectId: string): Promise<Web3ModalWallet[]> {
    const fetchPage = (namespace: string, page: number) =>
        fetchWallets({ page, entries: SNAPSHOT_PAGE_SIZE, chains: chainsForNamespace(namespace), projectId })
    const firstPages = await Promise.all(SNAPSHOT_NAMESPACES.map(namespace => fetchPage(namespace, 1)))
    const remainingPages = await Promise.all(SNAPSHOT_NAMESPACES.flatMap((namespace, i) => {
        const pageCount = Math.ceil(firstPages[i].count / SNAPSHOT_PAGE_SIZE)
        return Array.from({ length: Math.max(pageCount - 1, 0) }, (_, index) => fetchPage(namespace, index + 2))
    }))
    const seen = new Set<string>()
    const wallets: Web3ModalWallet[] = []
    for (const page of [...firstPages, ...remainingPages]) {
        for (const wallet of page.data) {
            if (seen.has(wallet.id)) continue
            seen.add(wallet.id)
            wallets.push(wallet)
        }
    }
    return wallets
}

export function normalizeRegistryNames(names: readonly string[]): string[] {
    return [...new Set(names.map(name => walletKey(name)).filter(Boolean))]
}

export function matchRegistrySnapshot(snapshot: readonly Web3ModalWallet[], keys: readonly string[], projectId: string): Web3ModalWallet[] {
    const unmatched = new Set(keys)
    const matches: Web3ModalWallet[] = []
    for (const wallet of snapshot) {
        if (!unmatched.size) break
        const mapped = mapWallet(wallet, projectId)
        if (SLUGS_TO_FILTER.includes(mapped.id)) continue
        const matchedKeys = [walletKey(mapped.name), walletKey(mapped.id)].filter(key => unmatched.has(key))
        if (!matchedKeys.length) continue
        for (const key of matchedKeys) unmatched.delete(key)
        matches.push(wallet)
    }
    return matches
}
