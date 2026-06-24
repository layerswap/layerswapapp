import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { DecimalInput, addDecimal, subtractDecimal } from "./amounts";
import { ExtendedRoutePlan, ExtendedRouteProvider, ResolvedExtendedMapping } from "./types";
import { realDepositAddressRoutePresent } from "./availability";
import { hyperliquidProvider } from "./providers/hyperliquid";

export { realDepositAddressRoutePresent };

// Adding a provider = one file + one entry here.
const SOURCE_PROVIDERS: ExtendedRouteProvider[] = [hyperliquidProvider]

export function getSourceProviders(): ExtendedRouteProvider[] {
    return SOURCE_PROVIDERS
}

export function isExtendedSourceNetwork(name?: string): boolean {
    if (!name) return false
    return SOURCE_PROVIDERS.some(p => p.extendedNetworkNames.includes(name))
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
        // Prefer the provider's per-destination resolver (e.g. HL primary/fallback).
        // `availableRoutes` lets it skip destinations the backend can't yet fulfill.
        // Static `mappings` is the fallback for providers with a single destination.
        const mapping = provider.resolveActiveMapping?.(networkName, tokenSymbol, toNetworkName, toTokenSymbol, availableRoutes)
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
    const mapping = getExtendedMapping(sourceNetworkName, sourceTokenSymbol, destinationNetworkName, destinationTokenSymbol, availableRoutes)
    if (!mapping) return undefined
    // Final guard: even after fallback the chosen real route must exist on the
    // backend, else this extended route can't be fulfilled at all.
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

/**
 * Append extended source routes (e.g. Hyperliquid) to a backend route list so
 * downstream consumers treat them as first-class sources — no per-call-site
 * resolving. Idempotent: skips names already present, so it is safe to call on
 * both the SSR fallback and revalidated backend data.
 */
export function mergeExtendedSourceRoutes(routes: NetworkRoute[], networks: NetworkWithTokens[]): NetworkRoute[] {
    const additions: NetworkRoute[] = []
    for (const provider of SOURCE_PROVIDERS) {
        for (const extendedName of provider.extendedNetworkNames) {
            // Future backend adoption = zero conflict: skip names already present.
            if (routes.some(r => r.name === extendedName)) continue
            const extendedRoute = provider.resolveExtendedRoute(extendedName, networks)
            if (extendedRoute) additions.push(extendedRoute)
        }
    }
    return additions.length ? [...routes, ...additions] : routes
}
