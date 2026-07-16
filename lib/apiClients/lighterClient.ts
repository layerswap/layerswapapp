const API_PREFIX = "/api/v1"

export class LighterApiError extends Error {
    constructor(
        readonly status: number,
        readonly path: string,
        readonly responseBody: string,
    ) {
        const detail = responseBody.trim().slice(0, 500)
        super(`Lighter ${path} failed with HTTP ${status}${detail ? `: ${detail}` : ''}`)
        this.name = 'LighterApiError'
    }
}

async function throwLighterApiError(response: Response, path: string): Promise<never> {
    const body = await response.text().catch(() => '')
    throw new LighterApiError(response.status, path, body)
}

export type SignedLighterTx = {
    txType: number
    txInfo: string
}

export type LighterAccount = {
    index?: number
    account_index?: number
    l1_address: string
    available_balance?: string
    collateral?: string
    [key: string]: unknown
}

export function lighterAccountIndex(account: LighterAccount): number {
    return Number(account.account_index ?? account.index ?? 0)
}

export type LighterResultResponse = {
    tx_hash?: string
    code?: number
    message?: string
    [key: string]: unknown
}

export type LighterFastWithdrawalInfo = LighterResultResponse & {
    to_account_index: number
    withdraw_limit: string
    max_withdrawal_amount: string
}

export type LighterApiKey = {
    api_key_index: number
    public_key: string
}

const parseAmount = (value: string | number | undefined): number => {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount : 0
}

async function formPost(nodeUrl: string, path: string, fields: Record<string, string>, timeoutMs?: number): Promise<LighterResultResponse> {
    const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
    const response = await fetchWithTimeout(`${nodeUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields).toString(),
        timeoutMs: timeoutMs ?? 60000,
    })
    if (!response.ok) return throwLighterApiError(response, path)
    return response.json()
}

async function authenticatedGet<T>(nodeUrl: string, path: string, auth: string, timeoutMs?: number): Promise<T> {
    const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
    const response = await fetchWithTimeout(`${nodeUrl}${path}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': auth,
        },
        timeoutMs: timeoutMs ?? 60000,
    })
    if (!response.ok) return throwLighterApiError(response, path)
    return response.json()
}

export class LighterClient {
    async getAccountByL1Address(l1Address: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<LighterAccount | undefined> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
        const { retry } = await import("@/lib/retry")
        const url = `${nodeUrl}${API_PREFIX}/account?by=l1_address&value=${encodeURIComponent(l1Address)}`
        const response = await retry(async () => await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500)

        if (response.status === 404) return undefined
        if (!response.ok) return throwLighterApiError(response, `${API_PREFIX}/account`)

        const data = await response.json()
        const accounts: LighterAccount[] = data?.accounts ?? data?.sub_accounts ?? []
        if (!accounts.length) return undefined
        return accounts.reduce((min, a) => (lighterAccountIndex(a) < lighterAccountIndex(min) ? a : min), accounts[0])
    }

    async getWithdrawableUsdc(l1Address: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<number> {
        const account = await this.getAccountByL1Address(l1Address, nodeUrl, timeoutMs, retryCount)
        if (!account) return 0
        return Math.max(parseAmount(account.available_balance ?? account.collateral), 0)
    }

    async isApiKeyRegistered(accountIndex: number, apiKeyIndex: number, publicKey: string, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<boolean> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
        const { retry } = await import("@/lib/retry")
        const url = `${nodeUrl}${API_PREFIX}/apikeys?account_index=${accountIndex}&api_key_index=${apiKeyIndex}`
        const response = await retry(async () => await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500)

        // Lighter returns 400 (not 404) when the requested API-key index has not
        // been registered yet. The account itself was resolved before this call,
        // so both statuses mean "key absent" here.
        if (response.status === 400 || response.status === 404) return false
        if (!response.ok) return throwLighterApiError(response, `${API_PREFIX}/apikeys`)

        const data = await response.json()
        const keys: { api_key_index?: number; public_key?: string }[] = data?.api_keys ?? []
        const normalize = (value: string | undefined) => value?.replace(/^0x/i, '').toLowerCase()
        const target = normalize(publicKey)
        return keys.some(k => Number(k.api_key_index) === apiKeyIndex && normalize(k.public_key) === target)
    }

    async getApiKeys(accountIndex: number, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<LighterApiKey[]> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
        const { retry } = await import("@/lib/retry")
        // Per Lighter's API contract, index 255 is the sentinel that returns all
        // registered keys rather than one specific slot.
        const url = `${nodeUrl}${API_PREFIX}/apikeys?account_index=${accountIndex}&api_key_index=255`
        const response = await retry(async () => await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500)

        if (!response.ok) return throwLighterApiError(response, `${API_PREFIX}/apikeys`)
        const data = await response.json()
        const keys: LighterApiKey[] = data?.api_keys ?? []
        return keys.filter(key => Number.isInteger(Number(key.api_key_index)) && typeof key.public_key === 'string')
    }

    async getNextNonce(accountIndex: number, apiKeyIndex: number, nodeUrl: string, timeoutMs?: number, retryCount?: number): Promise<number> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
        const { retry } = await import("@/lib/retry")
        const url = `${nodeUrl}${API_PREFIX}/nextNonce?account_index=${accountIndex}&api_key_index=${apiKeyIndex}`
        const response = await retry(async () => await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeoutMs: timeoutMs ?? 60000,
        }), retryCount ?? 3, 500)

        if (!response.ok) return throwLighterApiError(response, `${API_PREFIX}/nextNonce`)
        const data = await response.json()
        return parseAmount(data?.nonce)
    }

    // sendTx is form-encoded (tx_type uint8, tx_info string). Used for changePubKey etc.
    async sendTx(signed: SignedLighterTx, nodeUrl: string, timeoutMs?: number): Promise<LighterResultResponse> {
        return formPost(nodeUrl, `${API_PREFIX}/sendTx`, { tx_type: String(signed.txType), tx_info: signed.txInfo }, timeoutMs)
    }

    async getFastWithdrawalInfo(accountIndex: number, auth: string, nodeUrl: string, timeoutMs?: number): Promise<LighterFastWithdrawalInfo> {
        return authenticatedGet<LighterFastWithdrawalInfo>(nodeUrl, `${API_PREFIX}/fastwithdraw/info?account_index=${accountIndex}`, auth, timeoutMs)
    }

    async getTransferFee(accountIndex: number, toAccountIndex: number, auth: string, nodeUrl: string, timeoutMs?: number): Promise<number> {
        const result = await authenticatedGet<LighterResultResponse>(nodeUrl, `${API_PREFIX}/transferFeeInfo?account_index=${accountIndex}&to_account_index=${toAccountIndex}`, auth, timeoutMs)
        const fee = Number(result.transfer_fee_usdc)
        if (!Number.isSafeInteger(fee) || fee < 0) throw new Error('Invalid Lighter transfer fee')
        return fee
    }

    // Fast withdrawal is an L2 transfer to Lighter's bridge account. The endpoint
    // authenticates the API key and releases the transfer to this Ethereum address.
    async fastWithdraw(txInfo: string, toAddress: string, nodeUrl: string, auth: string, timeoutMs?: number): Promise<LighterResultResponse> {
        const { fetchWithTimeout } = await import("@/lib/fetchWithTimeout")
        const response = await fetchWithTimeout(`${nodeUrl}${API_PREFIX}/fastwithdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': auth,
            },
            body: new URLSearchParams({ tx_info: txInfo, to_address: toAddress }).toString(),
            timeoutMs: timeoutMs ?? 60000,
        })
        if (!response.ok) return throwLighterApiError(response, `${API_PREFIX}/fastwithdraw`)
        return response.json()
    }
}

export function isLighterOk(r: LighterResultResponse): boolean {
    return r.code === 200 || (r.code === undefined && !r.message)
}
