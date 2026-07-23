import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { DecimalInput, addDecimal, subtractDecimal } from "./amounts";
import { ExtendedRouteFlags, ExtendedRoutePlan, ExtendedRouteProvider, ResolvedExtendedMapping, requiredDepositMethod } from "./types";
import { realRoutePresent } from "./availability";

let sourceProviders: ExtendedRouteProvider[] = []

/**
 * Inject the extended route providers contributed by wallet packages. Called
 * once `walletProviders` is available (see `LayerswapProvider`), mirroring how
 * balance/gas providers flow from `WalletProvider` into their resolvers.
 * Idempotent — safe to call on every render.
 */
export function setExtendedRouteProviders(providers: ExtendedRouteProvider[]): void {
    sourceProviders = providers ?? []
}

export function getSourceProviders(): ExtendedRouteProvider[] {
    return sourceProviders
}

// Providers enabled by feature flags (keyed by provider id). When flags are absent
// (no SSR resolution and the public flags endpoint was unreachable) or lack an entry
// for a provider, that provider's own `enabledByDefault` decides — fail-open for pure
// client-side routes, fail-closed for ones with a server dependency (e.g. Polymarket's
// credential-gated relayer proxy).
function activeProviders(flags?: ExtendedRouteFlags): ExtendedRouteProvider[] {
    return sourceProviders.filter(p => flags?.[p.id] ?? p.enabledByDefault)
}

export function isExtendedSourceNetwork(name?: string): boolean {
    if (!name) return false
    return sourceProviders.some(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedProviderForNetwork(name?: string): ExtendedRouteProvider | undefined {
    if (!name) return undefined
    return sourceProviders.find(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedMapping(
    networkName?: string,
    tokenSymbol?: string,
    toNetworkName?: string,
    toTokenSymbol?: string,
    availableRoutes?: NetworkRoute[],
): ResolvedExtendedMapping | undefined {
    if (!networkName || !tokenSymbol) return undefined

    for (const provider of sourceProviders) {
        // A provider-defined resolver is authoritative: its `undefined` means
        // "no viable route for this destination" (e.g. destination IS the
        // intermediate, or no candidate passes availability) and must NOT fall
        // back to the static table, which would re-enable the excluded route.
        // Static `mappings` only serves providers without a resolver.
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
    const merged = additions.length ? [...routes, ...additions] : routes

    return merged.filter(route => {
        if (!isExtendedSourceNetwork(route.name)) return true
        return (route.tokens ?? []).some(token =>
            resolveExtendedRoutePlan({
                sourceNetworkName: route.name,
                sourceTokenSymbol: token.symbol,
                destinationNetworkName: toNetworkName,
                destinationTokenSymbol: toTokenSymbol,
                availableRoutes: routes,
            }) !== undefined)
    })
}

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
