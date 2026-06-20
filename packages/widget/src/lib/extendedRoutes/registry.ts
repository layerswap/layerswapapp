import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { DecimalInput, addDecimal, subtractDecimal } from "./amounts";
import { ExtendedRoutePlan, ExtendedRouteProvider, RealRouteRef, ResolvedExtendedMapping } from "./types";

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

export function isExtendedSourceNetwork(name?: string): boolean {
    if (!name) return false
    return sourceProviders.some(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedMapping(
    networkName?: string,
    tokenSymbol?: string,
    toNetworkName?: string,
    toTokenSymbol?: string,
): ResolvedExtendedMapping | undefined {
    if (!networkName || !tokenSymbol) return undefined

    for (const provider of sourceProviders) {
        // Prefer the provider's per-destination resolver (e.g. HL primary/fallback).
        // Static `mappings` is the fallback for providers with a single destination.
        const mapping = provider.resolveActiveMapping?.(networkName, tokenSymbol, toNetworkName, toTokenSymbol)
            ?? provider.mappings[networkName]?.[tokenSymbol]
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
    const mapping = getExtendedMapping(sourceNetworkName, sourceTokenSymbol, destinationNetworkName, destinationTokenSymbol)
    if (!mapping) return undefined
    if (availableRoutes && !realDepositAddressRoutePresent(availableRoutes, mapping.real)) return undefined

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

export function realDepositAddressRoutePresent(routes: NetworkRoute[], real: RealRouteRef): boolean {
    return routes.some(r =>
        r.name === real.networkName
        && r.deposit_methods?.includes('deposit_address')
        && r.tokens?.some(t => t.symbol === real.tokenSymbol && t.status === 'active'))
}

/**
 * Append extended source routes (e.g. Hyperliquid) to a backend route list so
 * downstream consumers treat them as first-class sources — no per-call-site
 * resolving. Idempotent: skips names already present, so it is safe to call on
 * both the SSR fallback and revalidated backend data.
 */
export function mergeExtendedSourceRoutes(routes: NetworkRoute[], networks: NetworkWithTokens[], toNetworkName?: string,
    toTokenSymbol?: string,): NetworkRoute[] {
    const additions: NetworkRoute[] = []
    for (const provider of sourceProviders) {
        for (const extendedName of provider.extendedNetworkNames) {
            // Future backend adoption = zero conflict: skip names already present.
            if (routes.some(r => r.name === extendedName)) continue
            const extendedRoute = provider.resolveExtendedRoute(extendedName, networks)
            if (extendedRoute) additions.push(extendedRoute)
        }
    }
    const _routes = additions.length ? [...routes, ...additions] : routes

    return _routes.filter(route => {
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
