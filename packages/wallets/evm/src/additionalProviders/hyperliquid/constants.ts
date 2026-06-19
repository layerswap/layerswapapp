import { NetworkWithTokens } from "@layerswap/widget/types";
import { HYPERLIQUID_ROUTES, pickHyperliquidDestination } from "./routes";

export const HYPERLIQUID_USDC_SYMBOL = 'USDC'
export const HYPERLIQUID_SPOT_TOKEN = 'USDC'
export const HYPERLIQUID_DEX_SPOT = 'spot'
export const HYPERLIQUID_DEX_PERP = ''
export const HYPERLIQUID_SOURCE_DEX = HYPERLIQUID_DEX_SPOT
export const HYPERLIQUID_WITHDRAW_GAS_LIMIT = 200000


export const HYPERLIQUID_WITHDRAW_HEADROOM = 0.01

export const HYPERLIQUID_TRANSFER_POLL_INTERVAL_MS = 1500
export const HYPERLIQUID_TRANSFER_POLL_TIMEOUT_MS = 30000

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
): HyperliquidConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = HYPERLIQUID_ROUTES[sourceNetworkName]
    if (!route) return undefined

    const dest = pickHyperliquidDestination(sourceNetworkName, toNetworkName, toTokenSymbol)
    if (!dest) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)

    return {
        nodeUrl: resolveNodeUrl(network?.node_url, route.defaultNodeUrl),
        hyperliquidChain: route.hyperliquidChain,
        signatureChainId: dest.signatureChainId,
        signatureChainIdHex: dest.signatureChainIdHex,
        destinationCctpDomain: dest.destinationCctpDomain,
    }
}
