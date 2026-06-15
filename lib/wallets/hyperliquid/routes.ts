import KnownInternalNames from "@/lib/knownIds";

/**
 * Single source of truth for each Hyperliquid CCTP withdrawal route, keyed by the
 * Hyperliquid source network. Holds everything needed to add or switch a
 * destination chain in ONE place: the real (destination) backend route, the CCTP
 * domain, the EVM chain id the typed data is signed against, and the route
 * economics (fee, arrival, minimum). Both `resolveHyperliquidConfig`
 * (lib/wallets/hyperliquid/constants.ts) and the extended-routes provider
 * (lib/extendedRoutes/providers/hyperliquid.ts) derive from this map.
 */
export type HyperliquidRoute = {
    hyperliquidChain: 'Mainnet' | 'Testnet'
    /** HL API endpoint; overridable per-network via settings `node_url`. */
    defaultNodeUrl: string
    /** Real (destination) backend route the withdrawal is fulfilled through. */
    realNetworkName: string
    realTokenSymbol: string
    /** Decimals of the real token; used to truncate the forwarded amount. */
    realDecimals: number
    /** Circle CCTP destination domain (6 = Base / Base Sepolia). */
    destinationCctpDomain: number
    /** Destination chain's EVM chain id; the typed-data domain is signed against it. */
    signatureChainId: number
    signatureChainIdHex: `0x${string}`
    /** CCTP forwarding fee, in source-token (USDC) units. */
    flatFee: number
    /** Typical arrival time added to the quote, in seconds. */
    arrivalSeconds: number
    /** Minimum amount that may leave Hyperliquid, in source-token units. */
    minSourceAmount: number
}

const MAINNET_NODE = "https://api.hyperliquid.xyz"
const TESTNET_NODE = "https://api.hyperliquid-testnet.xyz"

/** Base (and Base Sepolia) CCTP domain. */
const BASE_CCTP_DOMAIN = 6

export const HYPERLIQUID_ROUTES: Record<string, HyperliquidRoute> = {
    [KnownInternalNames.Networks.HyperliquidMainnet]: {
        hyperliquidChain: 'Mainnet',
        defaultNodeUrl: MAINNET_NODE,
        realNetworkName: KnownInternalNames.Networks.BaseMainnet,
        realTokenSymbol: 'USDC',
        realDecimals: 6,
        destinationCctpDomain: BASE_CCTP_DOMAIN,
        signatureChainId: 8453,
        signatureChainIdHex: '0x2105',
        flatFee: 0.2,
        arrivalSeconds: 300,
        minSourceAmount: 1,
    },
    [KnownInternalNames.Networks.HyperliquidTestnet]: {
        hyperliquidChain: 'Testnet',
        defaultNodeUrl: TESTNET_NODE,
        realNetworkName: KnownInternalNames.Networks.BaseSepolia,
        realTokenSymbol: 'USDC',
        realDecimals: 6,
        destinationCctpDomain: BASE_CCTP_DOMAIN,
        signatureChainId: 84532,
        signatureChainIdHex: '0x14a34',
        flatFee: 0.2,
        arrivalSeconds: 300,
        minSourceAmount: 1,
    },
}
