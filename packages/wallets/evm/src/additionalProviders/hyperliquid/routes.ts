
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
    /** Destination chain's EVM chain id; the typed-data domain is signed against it. */
    signatureChainId: number
    signatureChainIdHex: `0x${string}`
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

/** Base (and Base Sepolia) CCTP domain. */
const BASE_CCTP_DOMAIN = 6
/** Arbitrum (and Arbitrum Sepolia) CCTP domain. */
const ARBITRUM_CCTP_DOMAIN = 3

const BASE_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.BaseMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: BASE_CCTP_DOMAIN,
    signatureChainId: 8453,
    signatureChainIdHex: '0x2105',
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const ARBITRUM_MAINNET: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: ARBITRUM_CCTP_DOMAIN,
    signatureChainId: 42161,
    signatureChainIdHex: '0xa4b1',
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const BASE_SEPOLIA: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.BaseSepolia,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: BASE_CCTP_DOMAIN,
    signatureChainId: 84532,
    signatureChainIdHex: '0x14a34',
    flatFee: 0.2,
    arrivalSeconds: 5,
}
const ARBITRUM_SEPOLIA: HyperliquidDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumSepolia,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    destinationCctpDomain: ARBITRUM_CCTP_DOMAIN,
    signatureChainId: 421614,
    signatureChainIdHex: '0x66eee',
    flatFee: 0.2,
    arrivalSeconds: 5,
}

export const HYPERLIQUID_ROUTES: Record<string, HyperliquidRoute> = {
    [KnownInternalNames.Networks.HyperliquidMainnet]: {
        hyperliquidChain: 'Mainnet',
        defaultNodeUrl: MAINNET_NODE,
        destinations: [BASE_MAINNET, ARBITRUM_MAINNET],
    },
    [KnownInternalNames.Networks.HyperliquidTestnet]: {
        hyperliquidChain: 'Testnet',
        defaultNodeUrl: TESTNET_NODE,
        destinations: [BASE_SEPOLIA, ARBITRUM_SEPOLIA],
    },
}

/**
 * Pick the active destination for an HL source. Returns the first destination
 * whose (realNetworkName, realTokenSymbol) does not equal the user's selected
 * destination — the only case where a backend swap would be same-chain same-token.
 * If `to` is unset, returns the primary destination.
 */
export function pickHyperliquidDestination(
    hlNetworkName: string | undefined,
    toNetworkName?: string,
    toTokenSymbol?: string,
): HyperliquidDestination | undefined {
    if (!hlNetworkName) return undefined
    const route = HYPERLIQUID_ROUTES[hlNetworkName]
    if (!route) return undefined
    if (!toNetworkName || !toTokenSymbol) return route.destinations[0]
    return route.destinations.find(d =>
        !(d.realNetworkName === toNetworkName && d.realTokenSymbol === toTokenSymbol)
    ) ?? route.destinations[0]
}

/** Candidate (real network, real token) refs for an HL source — used by the
 * picker visibility filter to gate "show HL iff any candidate has a real route". */
export function getHyperliquidCandidates(hlNetworkName: string | undefined): { networkName: string; tokenSymbol: string }[] {
    if (!hlNetworkName) return []
    const route = HYPERLIQUID_ROUTES[hlNetworkName]
    if (!route) return []
    return route.destinations.map(d => ({ networkName: d.realNetworkName, tokenSymbol: d.realTokenSymbol }))
}
