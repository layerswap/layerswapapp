import KnownInternalNames from "@/lib/knownIds";

/**
 * Static configuration for the Polymarket extended withdrawal source.
 *
 * Polymarket holds user funds as pUSD (its collateral token) on Polygon, inside a
 * funder wallet (deposit wallet / Safe / proxy) deterministically derived from the
 * owner EOA. The user withdraws by signing a GASLESS transfer of pUSD into a Polymarket
 * bridge address; the bridge converts pUSD→USDC and delivers it to a Layerswap deposit
 * address on Polygon, which the backend then bridges to the user's final destination.
 * (pUSD isn't self-redeemable on-chain, so the bridge is the only path to USDC.)
 */

/** Symbol shown for the Polymarket source token. Both the extended (Polymarket) and
 * the real (Polygon) side are USDC-denominated, so this keeps the picker/skin/quote
 * transforms uniform — the pUSD nature is an implementation detail handled in the
 * balance provider and withdrawal flow. */
export const POLYMARKET_DISPLAY_SYMBOL = 'USDC'

/** Polygon — the only chain Polymarket collateral lives on, and the bridge/funder chain. */
export const POLYMARKET_CHAIN_ID = 137

/**
 * pUSD (Polymarket USD) collateral token on Polygon. Verified on-chain (the funder's
 * balance + the bridge quote both recognise this address).
 */
export const POLYMARKET_PUSD_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as `0x${string}`
export const POLYMARKET_PUSD_DECIMALS = 6

/** Native USDC on Polygon — the token the bridge pays out to the Layerswap deposit
 * address (`toTokenAddress` on the withdraw/quote calls). */
export const POLYMARKET_USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`
export const POLYMARKET_USDC_DECIMALS = 6

/** Legacy bridged USDC.e on Polygon — some Polymarket collateral predates the pUSD
 * migration, so balances are read in both pUSD and USDC.e. */
export const POLYMARKET_USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`

/** Public Polymarket bridge API (no auth). */
export const POLYMARKET_BRIDGE_URL = 'https://bridge.polymarket.com'

/** Builder code for bridge attribution (sent as the `X-Builder-Code` header). Public
 * identifier, not a secret — obtained at polymarket.com/settings?tab=builder. Optional:
 * without it the bridge still works but returns a `missing_builder_code` warning. */
export const POLYMARKET_BUILDER_CODE = process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_CODE || ''

/** Polymarket relayer base URL (used server-side by the relay proxy; the builder
 * API key never leaves the server). Overridable via `POLYMARKET_RELAYER_URL` env. */
export const POLYMARKET_RELAYER_URL = 'https://relayer-v2.polymarket.com'

/**
 * Polymarket Gnosis Safe contracts on Polygon, from `getContractConfig(137)` in
 * `@polymarket/builder-relayer-client`. Inlined so derivation/signing import only
 * from the package root. SafeFactory matches the on-chain Polymarket Safe Proxy
 * Factory (0xaacFeEa…3541b). Re-verify if the SDK config changes.
 */
export const POLYMARKET_SAFE_FACTORY = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as `0x${string}`
export const POLYMARKET_SAFE_MULTISEND = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761' as `0x${string}`
/** Custom proxy factory (MagicLink/email account funders). */
export const POLYMARKET_PROXY_FACTORY = '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052' as `0x${string}`
/** Deposit-wallet factory + implementation (the modern ERC-1967 account funder —
 * the default for current Polymarket accounts). From getContractConfig(137). */
export const POLYMARKET_DEPOSIT_WALLET_FACTORY = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07' as `0x${string}`
export const POLYMARKET_DEPOSIT_WALLET_IMPLEMENTATION = '0x58CA52ebe0DadfdF531Cde7062e76746de4Db1eB' as `0x${string}`

/**
 * Our Next.js relayer proxy. The Polymarket relayer requires a builder API key
 * (server secret) on `/submit`, so all relayer I/O is funneled through this route —
 * which also sidesteps cross-origin issues. See `pages/api/polymarket/relay.ts`.
 */
export const POLYMARKET_RELAYER_PROXY_PATH = '/api/polymarket/relay'

/** Conservative slippage buffer (in source-token units) for the pUSD→USDC conversion.
 * Modeled as the extended route's `flatFee` so the quote/limits transforms work
 * unchanged. The live `/quote` is validated against this at submit time. */
export const POLYMARKET_WITHDRAW_FEE_BUFFER = 0.1

/** Typical bridge completion time added to the quote, in seconds ("instant-to-minutes"). */
export const POLYMARKET_ARRIVAL_SECONDS = 120

/** Bridge minimum checkout (USD) — mirrors `/supported-assets` `minCheckoutUsd` for
 * Polygon USDC. Surfaced as the route's min so the form rejects below-min amounts
 * upfront; the live value is also re-checked at withdrawal time as the source of truth. */
export const POLYMARKET_MIN_WITHDRAW_USD = 2

/** Bridge status polling cadence + ceiling. */
export const POLYMARKET_STATUS_POLL_INTERVAL_MS = 4000
export const POLYMARKET_STATUS_POLL_TIMEOUT_MS = 180000

/** Deposit-wallet batch signature validity window, in seconds. */
export const POLYMARKET_BATCH_DEADLINE_SECONDS = 600
/** Polling for a just-deployed deposit wallet to appear on-chain. */
export const POLYMARKET_DEPLOY_POLL_INTERVAL_MS = 2000
export const POLYMARKET_DEPLOY_POLL_TIMEOUT_MS = 60000

/** Display identity for the synthesized Polymarket source network (see
 * `lib/extendedRoutes/providers/polymarket.ts`). Local asset under /public — avoids
 * next/image remote-host allowlisting and the SVG optimizer restriction. Can be
 * swapped for a Layerswap-CDN asset once one is added. */
export const POLYMARKET_DISPLAY_NAME = 'Polymarket'
export const POLYMARKET_LOGO = '/images/polymarket.png'

export type PolymarketConfig = {
    networkName: string
    /** Real backend network the withdrawal is fulfilled through (Polygon). */
    realNetworkName: string
    realTokenSymbol: string
    realDecimals: number
    /** Bridge destination chain id (same-chain Polygon = fastest, near-zero slippage). */
    bridgeToChainId: number
    bridgeToTokenAddress: `0x${string}`
    bridgeBaseUrl: string
    flatFee: number
    arrivalSeconds: number
}

export const POLYMARKET_CONFIG: Record<string, PolymarketConfig> = {
    [KnownInternalNames.Networks.PolymarketMainnet]: {
        networkName: KnownInternalNames.Networks.PolymarketMainnet,
        realNetworkName: KnownInternalNames.Networks.PolygonMainnet,
        realTokenSymbol: POLYMARKET_DISPLAY_SYMBOL,
        realDecimals: POLYMARKET_USDC_DECIMALS,
        bridgeToChainId: POLYMARKET_CHAIN_ID,
        bridgeToTokenAddress: POLYMARKET_USDC_ADDRESS,
        bridgeBaseUrl: POLYMARKET_BRIDGE_URL,
        flatFee: 0,
        arrivalSeconds: POLYMARKET_ARRIVAL_SECONDS,
    },
}

export function resolvePolymarketConfig(networkName: string | undefined): PolymarketConfig | undefined {
    if (!networkName) return undefined
    return POLYMARKET_CONFIG[networkName]
}
