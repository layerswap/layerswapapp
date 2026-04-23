const BASE = 'https://api.web3modal.org'

export type Web3ModalWallet = {
    id: string
    name: string
    image_id: string
    order: number
    mobile_link: string | null
    desktop_link: string | null
    link_mode: string | null
    rdns: string | null
    chrome_store: string | null
    injected: { namespace: string; injected_id: string }[] | null
    chains: string[]
}

export type GetWalletsResponse = {
    count: number
    data: Web3ModalWallet[]
    nextPage: number | null
    previousPage: number | null
}

export type FetchWalletsParams = {
    page?: number
    entries?: number
    chains?: string
    search?: string;
    projectId: string;
}

const EVM_CHAINS = [
    'eip155:1', 'eip155:10', 'eip155:56', 'eip155:137',
    'eip155:43114', 'eip155:42161', 'eip155:324', 'eip155:8453',
].join(',')

const SOLANA_CHAINS = [
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
].join(',')

export function chainsForNamespace(namespace: string): string {
    if (namespace === 'eip155') return EVM_CHAINS
    if (namespace === 'solana') return SOLANA_CHAINS
    return ''
}

function isValidWalletUrl(urlStr: string): boolean {
    try {
        const url = new URL(urlStr)
        return ['https:', 'http:'].includes(url.protocol)
    } catch {
        return false
    }
}

function isValidImageId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{1,100}$/.test(id)
}

export function walletImageUrl(imageId: string, projectId: string): string {
    return `https://explorer-api.walletconnect.com/v3/logo/md/${imageId}?projectId=${projectId}`
}

// Web3Modal explorer API reference: https://docs.reown.com/cloud/explorer
// The `st` / `sv` (source type / source version) params are internal AppKit
// telemetry routing keys required for the API to return results.
export async function fetchWallets(params: FetchWalletsParams): Promise<GetWalletsResponse> {
    const url = new URL(`${BASE}/getWallets`)
    url.searchParams.set('projectId', params.projectId)
    url.searchParams.set('st', 'appkit')
    url.searchParams.set('sv', 'react-viem')
    url.searchParams.set('page', String(params.page ?? 1))
    url.searchParams.set('entries', String(params.entries ?? 40))
    if (params.chains) url.searchParams.set('chains', params.chains)
    if (params.search) url.searchParams.set('search', params.search)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`getWallets failed: ${res.status}`)
    const data: GetWalletsResponse = await res.json()

    if (!Array.isArray(data?.data)) {
        throw new Error('Invalid response: missing data array')
    }
    for (const wallet of data.data) {
        if (typeof wallet.id !== 'string' || typeof wallet.name !== 'string') {
            throw new Error('Invalid wallet entry: missing id or name')
        }
        // Sanitize URLs: strip dangerous schemes and reject malformed URLs
        if (wallet.mobile_link && !isValidWalletUrl(wallet.mobile_link)) wallet.mobile_link = null
        if (wallet.desktop_link && !isValidWalletUrl(wallet.desktop_link)) wallet.desktop_link = null
        if (wallet.chrome_store && !isValidWalletUrl(wallet.chrome_store)) wallet.chrome_store = null
        if (typeof wallet.image_id !== 'string' || !isValidImageId(wallet.image_id)) wallet.image_id = ''
    }

    return data
}
