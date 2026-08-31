import { LIGHTER_RELAY_PROXY_URL } from "./constants";

/**
 * Client-side helper for the Lighter relay, routed through our Next.js proxy
 * (`LIGHTER_RELAY_PROXY_URL`). The proxy holds `LIGHTER_SIGNER_SECRET` and runs the
 * vendored official WASM signer, so the Lighter L2 half-signature never reaches the
 * browser. The user's own EVM wallet signature (added client-side, over the exact
 * payload the relay sealed) is what authorizes each registration and withdrawal.
 */

export type LighterL1SignPayload = { type: 'message'; message: string }

export type LighterRegistrationStatus = {
    registered: boolean
    publicKey: string
    signPayload?: LighterL1SignPayload
    registrationToken?: string
}

export type LighterWithdrawResult =
    | { ok: true; txHash: string; error?: never }
    | { ok: false; txHash?: never; error?: string }

export type LighterPreparedWithdrawal = {
    withdrawalToken: string
    signPayload: LighterL1SignPayload
    fee: string
    debitAmount: string
    netAmount: string
}

export type LighterWithdrawalAvailability = {
    available: true
    fee: string
    debitAmount: string
    netAmount: string
    withdrawalQuoteToken: string
}

async function relayResponseError(res: Response, fallback: string): Promise<Error> {
    const text = await res.text().catch(() => '')
    try {
        const body = JSON.parse(text) as { error?: unknown }
        if (typeof body.error === 'string' && body.error.trim()) return new Error(body.error)
    } catch {
        // Fall through to the bounded plain-text diagnostic below.
    }
    return new Error(`${fallback}: ${res.status}${text ? ` ${text.slice(0, 300)}` : ''}`)
}

async function proxyGet<T>(params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${LIGHTER_RELAY_PROXY_URL}?${qs}`, { method: 'GET' })
    if (!res.ok) throw await relayResponseError(res, `Lighter relay (${params.action}) failed`)
    return res.json() as Promise<T>
}

async function proxyPost<T>(body: unknown): Promise<T> {
    const res = await fetch(LIGHTER_RELAY_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw await relayResponseError(res, 'Lighter relay submit failed')
    return res.json() as Promise<T>
}

export async function getLighterRegistration(network: string, l1Address: string): Promise<LighterRegistrationStatus> {
    return proxyGet<LighterRegistrationStatus>({ action: 'registration', network, address: l1Address })
}

export async function registerLighterKey(registrationToken: string, l1Signature: string): Promise<{ ok: boolean; error?: string }> {
    return proxyPost<{ ok: boolean; error?: string }>({ action: 'register', registrationToken, l1Signature })
}

export async function prepareLighterWithdrawal(params: {
    withdrawalQuoteToken: string
    destinationRecipient: string
}): Promise<LighterPreparedWithdrawal> {
    return proxyPost<LighterPreparedWithdrawal>({ action: 'prepareWithdrawal', ...params })
}

export async function checkLighterWithdrawal(params: {
    network: string
    l1Address: string
    amount: string
    amountType: 'gross' | 'net'
}): Promise<LighterWithdrawalAvailability> {
    return proxyPost<LighterWithdrawalAvailability>({ action: 'checkWithdrawal', ...params })
}

export async function submitLighterWithdrawal(withdrawalToken: string, l1Signature: string): Promise<LighterWithdrawResult> {
    return proxyPost<LighterWithdrawResult>({ action: 'withdraw', withdrawalToken, l1Signature })
}
