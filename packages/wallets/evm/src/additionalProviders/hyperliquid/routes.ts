import type { RealRouteAvailability } from "@layerswap/widget/types";

/**
 * Single source of truth for Hyperliquid CCTP withdrawal routes, keyed by the
 * Hyperliquid source network. Each source carries an ordered list of
 * destination candidates; the first one whose (real network, real token) does
 * not equal the user's selected destination is used. This lets us silently
 * fall back to e.g. Arbitrum when the user picks Base/USDC — same-chain
 * same-token swaps (Base/USDC → Base/USDC) don't exist on the backend.
 *
 * Adding/switching a destination = one entry in `destinations`.
 */

import { KnownInternalNames } from "@layerswap/widget/internal"

/** Per-destination CCTP params + economics. Different chains can have different
 * forwarding fees, arrival times, decimals, and signature chain ids. */
export type HyperliquidDestination = {
    /** Real backend network the withdrawal is fulfilled through. */
    realNetworkName: string
    realTokenSymbol: string
    /** Decimals of the real token; used to truncate the forwarded amount. */
    realDecimals: number
    /** Circle CCTP destination domain (6 = Base, 3 = Arbitrum, …). */
    destinationCctpDomain: number
    /** CCTP forwarding fee, in source-token (USDC) units. */
    flatFee: number
    /** Typical arrival time added to the quote, in seconds. */
    arrivalSeconds: number
}

export type HyperliquidRoute = {
    hyperliquidChain: 'Mainnet' | 'Testnet'
    /** HL API endpoint; overridable per-network via settings `node_url`. */
    defaultNodeUrl: string
    /** Destination candidates in priority order. First non-conflicting one wins. */
    destinations: HyperliquidDestination[]
}

const MAINNET_NODE = "https://api.hyperliquid.xyz"
const TESTNET_NODE = "https://api.hyperliquid-testnet.xyz"

/** Avalanche C-Chain CCTP domain. */
const AVALANCHE_CCTP_DOMAIN = 1
/** Sonic CCTP domain. */
const SONIC_CCTP_DOMAIN = 13
/** Base (and Base Sepolia) CCTP domain. */
const BASE_CCTP_DOMAIN = 6
/** Arbitrum (and Arbitrum Sepolia) CCTP domain. */
const ARBITRUM_CCTP_DOMAIN = 3

const AVALANCHE_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.AvalancheMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: AVALANCHE_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const SONIC_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.SonicMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: SONIC_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const BASE_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.BaseMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: BASE_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const ARBITRUM_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: ARBITRUM_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const BASE_SEPOLIA: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.BaseSepolia,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: BASE_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const ARBITRUM_SEPOLIA: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumSepolia,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: ARBITRUM_CCTP_DOMAIN,
    flatFee: 0.2,
    arrivalSeconds: 5,
}

export const HYPERLIQUID_ROUTES: Record<string, HyperliquidRoute> = {
    [KnownInternalNames.Networks.HyperliquidMainnet]: {
        hyperliquidChain: 'Mainnet',
        defaultNodeUrl: MAINNET_NODE,
        destinations: [AVALANCHE_MAINNET, SONIC_MAINNET, BASE_MAINNET, ARBITRUM_MAINNET],
    },
    [KnownInternalNames.Networks.HyperliquidTestnet]: {
        hyperliquidChain: 'Testnet',
        defaultNodeUrl: TESTNET_NODE,
        destinations: [BASE_SEPOLIA, ARBITRUM_SEPOLIA],
    },
}

/**
 * Pick the active destination for an HL source, walking the configured priority
 * order (AVAX → Sonic → Base → Arbitrum) and returning the first candidate that:
 *   1. wouldn't create a same-chain same-token backend swap (those don't exist —
 *      e.g. picking Base/USDC skips the Base candidate), and
 *   2. is actually available on the backend, when an availability predicate is
 *      supplied — so newly-listed destinations (AVAX/Sonic) silently fall back to
 *      a live one (Base/Arbitrum) until the backend lists them.
 * Falls back to the first non-self-swap candidate when none are known-available,
 * and to the primary destination when `to` is unset.
 */
export function pickHyperliquidDestination(
    hlNetworkName: string | undefined,
    toNetworkName?: string,
    toTokenSymbol?: string,
    isRealRouteAvailable?: RealRouteAvailability,
): HyperliquidDestination | undefined {
    if (!hlNetworkName) return undefined
    const route = HYPERLIQUID_ROUTES[hlNetworkName]
    if (!route) return undefined

    const notSelfSwap = (d: HyperliquidDestination) =>
        !(d.realNetworkName === toNetworkName && d.realTokenSymbol === toTokenSymbol)
    const eligible = route.destinations.filter(notSelfSwap)
    const candidates = eligible.length ? eligible : route.destinations

    if (isRealRouteAvailable) {
        const available = candidates.find(d =>
            isRealRouteAvailable({ networkName: d.realNetworkName, tokenSymbol: d.realTokenSymbol })
        )
        if (available) return available
    }

    return candidates[0]
}

/** Candidate (real network, real token) refs for an HL source — used by the
 * picker visibility filter to gate "show HL iff any candidate has a real route". */
export function getHyperliquidCandidates(hlNetworkName: string | undefined): { networkName: string; tokenSymbol: string }[] {
    if (!hlNetworkName) return []
    const route = HYPERLIQUID_ROUTES[hlNetworkName]
    if (!route) return []
    return route.destinations.map(d => ({ networkName: d.realNetworkName, tokenSymbol: d.realTokenSymbol }))
}
