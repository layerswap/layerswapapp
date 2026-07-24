import { NetworkRoute, NetworkWithTokens, realRoutePresent } from "@layerswap/utils"
import { depositMethodForFunding } from "@layerswap/wallet-core/types"
import { HYPERLIQUID_ROUTES, pickHyperliquidDestination } from "./routes";

/** How the real backend leg is funded. The provider and the CCTP config resolver
 * below must derive the deposit method from this same value, or their destination
 * picks could diverge. */
export const HYPERLIQUID_FUNDING = 'deposit_address' as const

export const HYPERLIQUID_USDC_SYMBOL = 'USDC'
export const HYPERLIQUID_SPOT_TOKEN = 'USDC'
export const HYPERLIQUID_DEX_SPOT = 'spot'
export const HYPERLIQUID_DEX_PERP = ''
export const HYPERLIQUID_SOURCE_DEX = HYPERLIQUID_DEX_SPOT
export const HYPERLIQUID_WITHDRAW_GAS_LIMIT = 200000


export const HYPERLIQUID_WITHDRAW_HEADROOM = 0.01

export const HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS = 1500
export const HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS = 30000

// Hyperliquid actions are EIP-712-signed against a fixed Ethereum domain (the wallet must be
// on this chain to sign). The CCTP destination is carried separately by `destinationCctpDomain`,
// so the signing chain is independent of where the funds land — a constant Ethereum chain works.
export const HYPERLIQUID_SIGNATURE_CHAIN_ID_MAINNET = 1
export const HYPERLIQUID_SIGNATURE_CHAIN_ID_TESTNET = 11155111
const HYPERLIQUID_SIGNATURE_CHAIN_ID_HEX_MAINNET = '0x1' as const
const HYPERLIQUID_SIGNATURE_CHAIN_ID_HEX_TESTNET = '0xaa36a7' as const

export type HyperliquidChain = 'Mainnet' | 'Testnet'

function registrableDomain(hostname: string): string {
    return hostname.toLowerCase().split('.').slice(-2).join('.')
}

function resolveNodeUrl(override: string | undefined, defaultNodeUrl: string): string {
    if (!override) return defaultNodeUrl
    try {
        const candidate = new URL(override)
        const trusted = new URL(defaultNodeUrl)
        if (candidate.protocol !== 'https:') return defaultNodeUrl
        if (registrableDomain(candidate.hostname) !== registrableDomain(trusted.hostname)) return defaultNodeUrl
        return override
    } catch {
        return defaultNodeUrl
    }
}

export type HyperliquidConfig = {
    nodeUrl: string
    hyperliquidChain: HyperliquidChain
    /** EVM chain id whose domain the typed data is signed against — the chosen
     * CCTP destination chain. The connected wallet must be on this chain to sign. */
    signatureChainId: number
    /** Hex form of signatureChainId, as the action expects it. */
    signatureChainIdHex: `0x${string}`
    /** CCTP destination domain for the chosen destination. */
    destinationCctpDomain: number
}

export function resolveHyperliquidNodeUrl(networkName: string, override: string | undefined): string | undefined {
    const route = HYPERLIQUID_ROUTES[networkName]
    if (!route) return undefined
    return resolveNodeUrl(override, route.defaultNodeUrl)
}

export function resolveHyperliquidConfig(
    sourceNetworkName: string | undefined,
    networks: NetworkWithTokens[],
    toNetworkName?: string,
    toTokenSymbol?: string,
    availableRoutes?: NetworkRoute[],
): HyperliquidConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = HYPERLIQUID_ROUTES[sourceNetworkName]
    if (!route) return undefined

    // Must resolve to the SAME destination the backend swap was created against
    // (registry uses the same availability fallback), so the CCTP signature is
    // signed for the right chain.
    const isRealRouteAvailable = availableRoutes
        ? (real: { networkName: string; tokenSymbol: string }) => realRoutePresent(availableRoutes, real, depositMethodForFunding(HYPERLIQUID_FUNDING))
        : undefined
    const dest = pickHyperliquidDestination(sourceNetworkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
    if (!dest) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)
    const isTestnet = route.hyperliquidChain === 'Testnet'

    return {
        nodeUrl: resolveNodeUrl(network?.node_url, route.defaultNodeUrl),
        hyperliquidChain: route.hyperliquidChain,
        // Fixed Ethereum signing domain — independent of the CCTP destination below.
        signatureChainId: isTestnet ? HYPERLIQUID_SIGNATURE_CHAIN_ID_TESTNET : HYPERLIQUID_SIGNATURE_CHAIN_ID_MAINNET,
        signatureChainIdHex: isTestnet ? HYPERLIQUID_SIGNATURE_CHAIN_ID_HEX_TESTNET : HYPERLIQUID_SIGNATURE_CHAIN_ID_HEX_MAINNET,
        destinationCctpDomain: dest.destinationCctpDomain,
    }
}
