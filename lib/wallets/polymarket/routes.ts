import { POLYMARKET_CONFIG, POLYMARKET_DISPLAY_SYMBOL, PolymarketConfig } from "./constants";
import type { RealRouteAvailability } from "@/lib/extendedRoutes/types";

/**
 * Destination resolution for Polymarket withdrawals. v1 has a single intermediate
 * (Polygon/USDC, same-chain = fastest + near-zero slippage), so this is simpler than
 * the Hyperliquid multi-destination fallback — but it keeps the same shape so a
 * second bridge intermediate (e.g. Arbitrum/USDC) can be added later.
 */

/** Candidate (real network, real token) refs — used by the picker visibility filter
 * ("show Polymarket iff any candidate has a real deposit-address route"). */
export function getPolymarketCandidates(networkName: string | undefined): { networkName: string; tokenSymbol: string }[] {
    if (!networkName) return []
    const cfg = POLYMARKET_CONFIG[networkName]
    if (!cfg) return []
    return [{ networkName: cfg.realNetworkName, tokenSymbol: cfg.realTokenSymbol }]
}

/**
 * Pick the active intermediate for a Polymarket source. Returns undefined when:
 *   1. it would create a same-chain same-token backend swap (the user's destination
 *      IS the intermediate, e.g. Polygon/USDC) — those don't exist on the backend, or
 *   2. an availability predicate is supplied and the intermediate isn't currently
 *      offered as a deposit-address route on the backend.
 */
export function pickPolymarketDestination(
    networkName: string | undefined,
    toNetworkName?: string,
    toTokenSymbol?: string,
    isRealRouteAvailable?: RealRouteAvailability,
): PolymarketConfig | undefined {
    if (!networkName) return undefined
    const cfg = POLYMARKET_CONFIG[networkName]
    if (!cfg) return undefined

    if (cfg.realNetworkName === toNetworkName && cfg.realTokenSymbol === toTokenSymbol) return undefined
    if (isRealRouteAvailable && !isRealRouteAvailable({ networkName: cfg.realNetworkName, tokenSymbol: cfg.realTokenSymbol })) return undefined

    return cfg
}

export { POLYMARKET_CONFIG, POLYMARKET_DISPLAY_SYMBOL }
export type { PolymarketConfig }
