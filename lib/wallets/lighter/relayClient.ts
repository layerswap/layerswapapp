import { LIGHTER_RELAY_PROXY_PATH } from "./constants";

function proxyPath(basePath: string): string {
    return `${basePath}${LIGHTER_RELAY_PROXY_PATH}`
}

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

async function proxyGet<T>(params: Record<string, string>, basePath: string): Promise<T> {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${proxyPath(basePath)}?${qs}`, { method: 'GET' })
    if (!res.ok) throw await relayResponseError(res, `Lighter relay (${params.action}) failed`)
    return res.json() as Promise<T>
}

async function proxyPost<T>(body: unknown, basePath: string): Promise<T> {
    const res = await fetch(proxyPath(basePath), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw await relayResponseError(res, 'Lighter relay submit failed')
    return res.json() as Promise<T>
}

export async function getLighterRegistration(network: string, l1Address: string, basePath: string): Promise<LighterRegistrationStatus> {
    return proxyGet<LighterRegistrationStatus>({ action: 'registration', network, address: l1Address }, basePath)
}

export async function registerLighterKey(registrationToken: string, l1Signature: string, basePath: string): Promise<{ ok: boolean; error?: string }> {
    return proxyPost<{ ok: boolean; error?: string }>({ action: 'register', registrationToken, l1Signature }, basePath)
}

export async function prepareLighterWithdrawal(
    params: {
        withdrawalQuoteToken: string
        destinationRecipient: string
    },
    basePath: string,
): Promise<LighterPreparedWithdrawal> {
    return proxyPost<LighterPreparedWithdrawal>({ action: 'prepareWithdrawal', ...params }, basePath)
}

export async function checkLighterWithdrawal(
    params: {
        network: string
        l1Address: string
        amount: string
        amountType: 'gross' | 'net'
    },
    basePath: string,
): Promise<LighterWithdrawalAvailability> {
    return proxyPost<LighterWithdrawalAvailability>({ action: 'checkWithdrawal', ...params }, basePath)
}

export async function submitLighterWithdrawal(withdrawalToken: string, l1Signature: string, basePath: string): Promise<LighterWithdrawResult> {
    return proxyPost<LighterWithdrawResult>({ action: 'withdraw', withdrawalToken, l1Signature }, basePath)
}
