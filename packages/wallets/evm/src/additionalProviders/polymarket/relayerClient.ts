import { POLYMARKET_RELAYER_PROXY_PATH } from "./constants";

/**
 * Client-side helper for the Polymarket relayer, routed through our Next.js proxy
 * (`/api/polymarket/relay`). The proxy holds the builder API key (server secret) and
 * attaches builder auth on submit; routing reads through it too avoids cross-origin
 * issues. The user's own signature (built client-side) is what actually authorizes
 * the fund movement — the builder key only authorizes use of the relayer (gas).
 */

/** A single call inside a deposit-wallet batch. */
export type DepositWalletCall = { target: string; value: string; data: string }

/** Gnosis-Safe relayer request (`/submit`). */
export type SafeTransactionRequest = {
    type: 'SAFE'
    from: string
    to: string
    proxyWallet: string
    data: string
    nonce: string
    signature: string
    signatureParams: {
        gasPrice: string
        operation: string
        safeTxnGas: string
        baseGas: string
        gasToken: string
        refundReceiver: string
    }
    metadata?: string
}

/** Deposit-wallet batch relayer request (`/submit`). */
export type DepositWalletBatchRequest = {
    type: 'WALLET'
    from: string
    to: string
    nonce: string
    signature: string
    depositWalletParams: { depositWallet: string; deadline: string; calls: DepositWalletCall[] }
}

/** Deposit-wallet deploy request (`/submit`, no signature). */
export type DepositWalletCreateRequest = {
    type: 'WALLET-CREATE'
    from: string
    to: string
}

/** Anything the relayer `/submit` accepts. The proxy just forwards the JSON. */
export type RelayerSubmittable = SafeTransactionRequest | DepositWalletBatchRequest | DepositWalletCreateRequest

export type RelayerSubmitResponse = {
    transactionID: string
    state: string
    transactionHash?: string
}

export type RelayerTransaction = {
    transactionID: string
    transactionHash?: string
    state: string
    type?: string
    proxyAddress?: string
    from?: string
    to?: string
}

async function proxyGet<T>(params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${POLYMARKET_RELAYER_PROXY_PATH}?${qs}`, { method: 'GET' })
    if (!res.ok) throw new Error(`Polymarket relayer (${params.action}) failed: ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`)
    return res.json() as Promise<T>
}

/** Relayer signer type. The nonce is always keyed on the owner EOA + the funder type. */
export type RelayerSignerType = 'SAFE' | 'PROXY' | 'WALLET'

export async function getRelayerNonce(ownerEoa: string, type: RelayerSignerType): Promise<string> {
    const data = await proxyGet<{ nonce: string }>({ action: 'nonce', address: ownerEoa, type })
    return data.nonce
}

export async function isPolymarketDeployed(address: string, type: RelayerSignerType): Promise<boolean> {
    const data = await proxyGet<{ deployed: boolean }>({ action: 'deployed', address, type })
    return !!data.deployed
}

export async function submitRelayerTransaction(request: RelayerSubmittable): Promise<RelayerSubmitResponse> {
    const res = await fetch(POLYMARKET_RELAYER_PROXY_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', request }),
    })
    if (!res.ok) throw new Error(`Polymarket relayer submit failed: ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`)
    return res.json() as Promise<RelayerSubmitResponse>
}

export async function getRelayerTransaction(id: string): Promise<RelayerTransaction[]> {
    const data = await proxyGet<RelayerTransaction[] | { transactions?: RelayerTransaction[] }>({ action: 'transaction', id })
    return Array.isArray(data) ? data : (data.transactions ?? [])
}
