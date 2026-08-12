import { POLYMARKET_RELAYER_PROXY_URL } from "./constants";
import { PROVIDER_DISABLED_CODE, type RelayerSubmittable, type RelayerSubmitResponse } from "./protocol";

/**
 * Client-side helper for the Polymarket relayer, routed through our Next.js proxy
 * (`POLYMARKET_RELAYER_PROXY_URL`). The proxy holds the builder API key (server secret)
 * and attaches builder auth on submit. The user's own signature (built client-side) is
 * what actually authorizes the fund movement — the builder key only authorizes use of
 * the relayer (gas).
 *
 * The request/response shapes live in `./protocol` — the shared module both this
 * client and the server proxy (`apps/bridge/pages/api/polymarket/relay.ts`) import,
 * so the two sides cannot drift.
 */
export type {
    DepositWalletCall,
    SafeTransactionRequest,
    DepositWalletBatchRequest,
    DepositWalletCreateRequest,
    RelayerSubmittable,
    RelayerSubmitResponse,
} from "./protocol";

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
