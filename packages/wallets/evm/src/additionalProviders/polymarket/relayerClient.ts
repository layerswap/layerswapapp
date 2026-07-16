import { POLYMARKET_RELAYER_PROXY_URL } from "./constants";

/**
 * Client-side helper for the Polymarket relayer, routed through our Next.js proxy
 * (`POLYMARKET_RELAYER_PROXY_URL`). The proxy holds the builder API key (server secret)
 * and attaches builder auth on submit. The user's own signature (built client-side) is
 * what actually authorizes the fund movement — the builder key only authorizes use of
 * the relayer (gas).
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

/** Machine-readable body the proxy returns when the Polymarket kill switch is off
 * (dashboard flag disabled or builder creds missing) — see `api/polymarket/relay.ts`. */
const PROVIDER_DISABLED_CODE = 'provider_disabled'

/** Build the error for a failed proxy response. A kill-switch refusal gets user-facing
 * copy (`header` is what the withdrawal UI shows as the title); anything else keeps the
 * raw status + body for diagnostics. */
async function relayerError(res: Response, context: string): Promise<Error> {
    const text = await res.text().catch(() => '')
    let code: string | undefined
    try { code = JSON.parse(text)?.error } catch { /* non-JSON body */ }
    if (code === PROVIDER_DISABLED_CODE) {
        const e = new Error('Polymarket withdrawals are temporarily unavailable. Please try again later.')
        ;(e as any).header = 'Polymarket is unavailable'
        return e
    }
    return new Error(`${context} failed: ${res.status} ${text.slice(0, 300)}`)
}

async function proxyGet<T>(params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${POLYMARKET_RELAYER_PROXY_URL}?${qs}`, { method: 'GET' })
    if (!res.ok) throw await relayerError(res, `Polymarket relayer (${params.action})`)
    return res.json() as Promise<T>
}

/** Relayer signer type. The nonce is always keyed on the owner EOA + the funder type. */
export type RelayerSignerType = 'SAFE' | 'PROXY' | 'WALLET'

export async function getRelayerNonce(ownerEoa: string, type: RelayerSignerType): Promise<string> {
    const data = await proxyGet<{ nonce: string }>({ action: 'nonce', address: ownerEoa, type })
    // The nonce flows straight into `BigInt(nonce)` when building the withdrawal
    // request. Guard here so a malformed relayer response surfaces a clear error
    // rather than a cryptic `TypeError`/`SyntaxError` deep in the transfer flow.
    if (typeof data?.nonce !== 'string' || data.nonce.length === 0) {
        throw new Error('Polymarket relayer returned an invalid nonce')
    }
    return data.nonce
}

export async function isPolymarketDeployed(address: string, type: RelayerSignerType): Promise<boolean> {
    const data = await proxyGet<{ deployed: boolean }>({ action: 'deployed', address, type })
    return !!data.deployed
}

export async function submitRelayerTransaction(request: RelayerSubmittable): Promise<RelayerSubmitResponse> {
    const res = await fetch(POLYMARKET_RELAYER_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', request }),
    })
    if (!res.ok) throw await relayerError(res, 'Polymarket relayer submit')
    const data = await res.json()
    // Validate the shape the `as RelayerSubmitResponse` cast would otherwise
    // assume — a null/malformed submit response should fail loudly here rather
    // than propagate an object that lies about its type to callers.
    if (typeof data?.transactionID !== 'string' || typeof data?.state !== 'string') {
        throw new Error('Polymarket relayer returned an invalid submit response')
    }
    return data as RelayerSubmitResponse
}
