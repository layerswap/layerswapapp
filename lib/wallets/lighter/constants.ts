import KnownInternalNames from "@/lib/knownIds";
import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { realRoutePresent } from "@/lib/extendedRoutes/availability";
import { depositMethodForFunding } from "@/lib/extendedRoutes/types";
import { LIGHTER_ROUTES, pickLighterDestination } from "./routes";

export const LIGHTER_FUNDING = 'deposit_address' as const

export const LIGHTER_USDC_SYMBOL = 'USDC'

export const LIGHTER_RELAY_PROXY_PATH = '/api/lighter/relay'

export const LIGHTER_DISPLAY_NAME = 'Lighter'
export const LIGHTER_LOGO = '/images/lighter.png'

export const LIGHTER_BASE_TOKEN_SYMBOL = KnownInternalNames.Currencies.USDC

export type LighterChain = 'Mainnet' | 'Testnet'

export type LighterNetworkConfig = {
    networkName: string
    baseNetworkName: string
}

export const LIGHTER_CONFIG: Record<string, LighterNetworkConfig> = {
    [KnownInternalNames.Networks.LighterMainnet]: {
        networkName: KnownInternalNames.Networks.LighterMainnet,
        baseNetworkName: KnownInternalNames.Networks.ArbitrumMainnet,
    },
    [KnownInternalNames.Networks.LighterTestnet]: {
        networkName: KnownInternalNames.Networks.LighterTestnet,
        baseNetworkName: KnownInternalNames.Networks.ArbitrumSepolia,
    },
}

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

export type LighterConfig = {
    nodeUrl: string
    lighterChain: LighterChain
    quotedFastWithdrawalFee: number
    realNetworkName: string
    realTokenSymbol: string
    realDecimals: number
}

export function resolveLighterNodeUrl(networkName: string, override: string | undefined): string | undefined {
    const route = LIGHTER_ROUTES[networkName]
    if (!route) return undefined
    return resolveNodeUrl(override, route.defaultNodeUrl)
}

export function resolveLighterConfig(
    sourceNetworkName: string | undefined,
    networks: NetworkWithTokens[],
    toNetworkName?: string,
    toTokenSymbol?: string,
    availableRoutes?: NetworkRoute[],
): LighterConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = LIGHTER_ROUTES[sourceNetworkName]
    if (!route) return undefined

    const isRealRouteAvailable = availableRoutes
        ? (real: { networkName: string; tokenSymbol: string }) => realRoutePresent(availableRoutes, real, depositMethodForFunding(LIGHTER_FUNDING))
        : undefined
    const dest = pickLighterDestination(sourceNetworkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
    if (!dest) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)

    return {
        nodeUrl: resolveNodeUrl(network?.node_url, route.defaultNodeUrl),
        lighterChain: route.lighterChain,
        quotedFastWithdrawalFee: dest.flatFee,
        realNetworkName: dest.realNetworkName,
        realTokenSymbol: dest.realTokenSymbol,
        realDecimals: dest.realDecimals,
    }
}
