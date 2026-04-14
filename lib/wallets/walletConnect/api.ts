import { WALLETCONNECT_PROJECT_ID } from "./config"

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
    search?: string
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

export function walletImageUrl(imageId: string): string {
    return `https://explorer-api.walletconnect.com/v3/logo/md/${imageId}?projectId=${WALLETCONNECT_PROJECT_ID}`
}

export async function fetchWallets(params: FetchWalletsParams): Promise<GetWalletsResponse> {
    const url = new URL(`${BASE}/getWallets`)
    url.searchParams.set('projectId', WALLETCONNECT_PROJECT_ID)
    url.searchParams.set('st', 'appkit')
    url.searchParams.set('sv', 'react-ethers')
    url.searchParams.set('page', String(params.page ?? 1))
    url.searchParams.set('entries', String(params.entries ?? 40))
    if (params.chains) url.searchParams.set('chains', params.chains)
    if (params.search) url.searchParams.set('search', params.search)

    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`getWallets failed: ${res.status}`)
    return res.json()
}
