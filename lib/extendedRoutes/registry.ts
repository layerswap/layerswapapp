import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { DecimalInput, addDecimal, subtractDecimal } from "./amounts";
import { ExtendedRouteFlags, ExtendedRoutePlan, ExtendedRouteProvider, ResolvedExtendedMapping, requiredDepositMethod } from "./types";
import { realRoutePresent } from "./availability";
import { hyperliquidProvider } from "./providers/hyperliquid";
import { polymarketProvider } from "./providers/polymarket";

// Adding a provider = one file + one entry here.
const SOURCE_PROVIDERS: ExtendedRouteProvider[] = [hyperliquidProvider, polymarketProvider]

export function getSourceProviders(): ExtendedRouteProvider[] {
    return SOURCE_PROVIDERS
}

// Providers enabled by feature flags (keyed by provider id). Undefined flags ⇒ all
// enabled, so callers without flags keep full behavior (kill-switch defaults on).
function activeProviders(flags?: ExtendedRouteFlags): ExtendedRouteProvider[] {
    if (!flags) return SOURCE_PROVIDERS
    return SOURCE_PROVIDERS.filter(p => flags[p.id] !== false)
}

export function isExtendedSourceNetwork(name?: string): boolean {
    if (!name) return false
    return SOURCE_PROVIDERS.some(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedProviderForNetwork(name?: string): ExtendedRouteProvider | undefined {
    if (!name) return undefined
    return SOURCE_PROVIDERS.find(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedMapping(
    networkName?: string,
    tokenSymbol?: string,
    toNetworkName?: string,
    toTokenSymbol?: string,
    availableRoutes?: NetworkRoute[],
): ResolvedExtendedMapping | undefined {
    if (!networkName || !tokenSymbol) return undefined

    for (const provider of SOURCE_PROVIDERS) {
        const mapping = provider.resolveActiveMapping
            ? provider.resolveActiveMapping(networkName, tokenSymbol, toNetworkName, toTokenSymbol, availableRoutes)
            : provider.mappings[networkName]?.[tokenSymbol]
        if (!mapping) continue

        const realDecimals = mapping.realDecimals ?? 6

        return {
            ...mapping,
            provider,
            extendedNetworkName: networkName,
            toRealAmount(sourceAmount) {
                return subtractDecimal(sourceAmount, mapping.flatFee, realDecimals)
            },
            toSourceAmount(realAmount) {
                return addDecimal(realAmount, mapping.flatFee, realDecimals)
            },
        }
    }

    return undefined
}

export type ResolveExtendedRoutePlanArgs = {
    sourceNetworkName?: string
    sourceTokenSymbol?: string
    destinationNetworkName?: string
    destinationTokenSymbol?: string
    sourceAmount?: DecimalInput
    availableRoutes?: NetworkRoute[]
}

export function resolveExtendedRoutePlan({
    sourceNetworkName,
    sourceTokenSymbol,
    destinationNetworkName,
    destinationTokenSymbol,
    sourceAmount,
    availableRoutes,
}: ResolveExtendedRoutePlanArgs): ExtendedRoutePlan | undefined {
    const mapping = getExtendedMapping(sourceNetworkName, sourceTokenSymbol, destinationNetworkName, destinationTokenSymbol, availableRoutes)
    if (!mapping) return undefined
    // Final guard: the chosen real route must exist on the backend with the deposit
    // method this provider funds through, else the extended route can't be fulfilled.
    if (availableRoutes && !realRoutePresent(availableRoutes, mapping.real, requiredDepositMethod(mapping.provider))) return undefined

    const hasSourceAmount = sourceAmount !== undefined && String(sourceAmount).trim() !== ''
    let realAmount: string | undefined
    if (hasSourceAmount) {
        try {
            realAmount = mapping.toRealAmount(sourceAmount)
        } catch {
            realAmount = undefined
        }
    }

    return {
        mapping,
        sourceAmount: hasSourceAmount ? String(sourceAmount) : undefined,
        realAmount,
    }
}

/**
 * Append extended source routes (e.g. Hyperliquid) to a backend route list so
 * downstream consumers treat them as first-class sources — no per-call-site
 * resolving. Idempotent: skips names already present, so it is safe to call on
 * both the SSR fallback and revalidated backend data.
 */
export function mergeExtendedSourceRoutes(
    routes: NetworkRoute[],
    networks: NetworkWithTokens[],
    toNetworkName?: string,
    toTokenSymbol?: string,
    flags?: ExtendedRouteFlags,
): NetworkRoute[] {
    const hasDestination = !!toNetworkName && !!toTokenSymbol
    const additions: NetworkRoute[] = []
    for (const provider of activeProviders(flags)) {
        for (const extendedName of provider.extendedNetworkNames) {
            // Future backend adoption = zero conflict: skip names already present.
            if (routes.some(r => r.name === extendedName)) continue
            const extendedRoute = provider.resolveExtendedRoute(extendedName, networks)
            if (!extendedRoute) continue
            if (!hasDestination) {
                additions.push(extendedRoute)
                continue
            }
            const tokens = extendedRoute.tokens?.filter(t => !!getExtendedMapping(extendedName, t.symbol, toNetworkName, toTokenSymbol)) ?? []
            if (!tokens.length) continue
            additions.push(tokens.length === extendedRoute.tokens?.length ? extendedRoute : { ...extendedRoute, tokens })
        }
    }
    return additions.length ? [...routes, ...additions] : routes
}

/**
 * Inject synthesized extended networks (e.g. Polymarket) into the settings
 * `networks` list — for providers whose network the backend does NOT define. Run
 * once at settings inflation (before `mergeExtendedSourceRoutes`) so the route
 * resolver, source skin, and balance prioritization all resolve the network the same
 * way they do for a backend-defined one. Idempotent: skips names already present, so
 * a future backend entry takes precedence with zero conflict. Providers without
 * `resolveExtendedNetwork` (e.g. Hyperliquid) contribute nothing.
 */
export function mergeExtendedSourceNetworks(networks: NetworkWithTokens[], flags?: ExtendedRouteFlags): NetworkWithTokens[] {
    const additions: NetworkWithTokens[] = []
    for (const provider of activeProviders(flags)) {
        if (!provider.resolveExtendedNetwork) continue
        for (const extendedName of provider.extendedNetworkNames) {
            if (networks.some(n => n.name === extendedName)) continue
            const network = provider.resolveExtendedNetwork(extendedName, networks)
            if (network) additions.push(network)
        }
    }
    return additions.length ? [...networks, ...additions] : networks
}
