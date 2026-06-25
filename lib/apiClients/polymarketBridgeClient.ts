import { POLYMARKET_BRIDGE_URL, POLYMARKET_BUILDER_CODE } from "@/lib/wallets/polymarket/constants";

/**
 * Thin client for the public Polymarket bridge API (`bridge.polymarket.com`).
 * The bridge converts pUSD→USDC and delivers it to an arbitrary recipient on a
 * supported chain. We use it to pay USDC out to a Layerswap deposit address on
 * Polygon. No authentication — these are public, read/address-generation endpoints.
 *
 * Schemas mirror the live API (captured June 2026); field names should be
 * re-verified if the bridge API version changes.
 */

export type PolymarketSupportedAsset = {
    chainId: string
    chainName: string
    token: { name: string; symbol: string; address: string; decimals: number }
    minCheckoutUsd: number
}

export type PolymarketQuote = {
    /** Estimated time to checkout, in ms. */
    estCheckoutTimeMs: number
    estFeeBreakdown: {
        appFeeLabel: string
        appFeePercent: number
        appFeeUsd: number
        fillCostPercent: number
        fillCostUsd: number
        gasUsd: number
        maxSlippage: number
        /** Minimum received on the destination token (after max slippage), human units. */
        minReceived: number
        swapImpact: number
        swapImpactUsd: number
        totalImpact: number
        totalImpactUsd: number
    }
    estInputUsd: number
    estOutputUsd: number
    /** Estimated output in the destination token's base units. */
    estToTokenBaseUnit: string
    quoteId: string
}

export type PolymarketBridgeWarning = { code: string; message: string }

export type PolymarketWithdrawAddresses = {
    /** Destination-type bridge addresses. Send the source token to the one matching
     * the destination chain type (we use `evm` for Polygon). */
    address?: {
        evm?: string
        svm?: string
        tron?: string
        btc?: string
    }
    note?: string
    warnings?: PolymarketBridgeWarning[]
}

export type PolymarketBridgeStatusEntry = {
    fromChainId?: string
    toChainId?: string
    fromTokenAddress?: string
    toTokenAddress?: string
    fromAmountBaseUnit?: string
    /** DEPOSIT_DETECTED | PROCESSING | ORIGIN_TX_CONFIRMED | SUBMITTED | COMPLETED | FAILED */
    status: string
    /** Destination tx hash, present once complete. */
    txHash?: string
    createdTimeMs?: number
}

export type PolymarketQuoteParams = {
    fromAmountBaseUnit: string
    fromChainId: string
    toChainId: string
    fromTokenAddress: string
    toTokenAddress: string
    recipientAddress: string
}

export type PolymarketWithdrawParams = {
    /** Source Polymarket (funder) wallet on Polygon. */
    address: string
    toChainId: string
    toTokenAddress: string
    /** Final wallet that receives the bridged funds (the Layerswap deposit address). */
    recipientAddr: string
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED'])
export const isTerminalBridgeStatus = (status: string): boolean => TERMINAL_STATUSES.has(status?.toUpperCase?.() ?? '')
export const isBridgeStatusFailed = (status: string): boolean => status?.toUpperCase?.() === 'FAILED'

export class PolymarketBridgeClient {
    private readonly baseUrl: string

    constructor(baseUrl: string = POLYMARKET_BRIDGE_URL) {
        this.baseUrl = baseUrl.replace(/\/+$/, '')
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: {
                'Content-Type': 'application/json',
                ...(POLYMARKET_BUILDER_CODE ? { 'X-Builder-Code': POLYMARKET_BUILDER_CODE } : {}),
                ...(init?.headers ?? {}),
            },
        })
        if (!res.ok) {
            const body = await res.text().catch(() => '')
            throw new Error(`Polymarket bridge ${path} failed (${res.status}): ${body.slice(0, 300)}`)
        }
        return res.json() as Promise<T>
    }

    async getSupportedAssets(): Promise<PolymarketSupportedAsset[]> {
        const data = await this.request<{ supportedAssets: PolymarketSupportedAsset[] }>(`/supported-assets`)
        return data.supportedAssets ?? []
    }

    /**
     * Minimum withdrawal (checkout) amount in USD for a destination chain+token. The
     * bridge silently ignores deposits below this — enforce it before moving funds so
     * the user's collateral can't get stranded at a bridge address.
     */
    async getMinCheckoutUsd(toChainId: string, toTokenAddress: string): Promise<number | undefined> {
        const assets = await this.getSupportedAssets()
        const match = assets.find(a => a.chainId === toChainId && a.token.address.toLowerCase() === toTokenAddress.toLowerCase())
        return match?.minCheckoutUsd
    }

    async getQuote(params: PolymarketQuoteParams): Promise<PolymarketQuote> {
        return this.request<PolymarketQuote>(`/quote`, { method: 'POST', body: JSON.stringify(params) })
    }

    async createWithdrawalAddresses(params: PolymarketWithdrawParams): Promise<PolymarketWithdrawAddresses> {
        return this.request<PolymarketWithdrawAddresses>(`/withdraw`, { method: 'POST', body: JSON.stringify(params) })
    }

    async getStatus(bridgeAddress: string): Promise<PolymarketBridgeStatusEntry[]> {
        const data = await this.request<{ transactions?: PolymarketBridgeStatusEntry[] } | PolymarketBridgeStatusEntry[]>(`/status/${bridgeAddress}`)
        if (Array.isArray(data)) return data
        return data.transactions ?? []
    }
}
