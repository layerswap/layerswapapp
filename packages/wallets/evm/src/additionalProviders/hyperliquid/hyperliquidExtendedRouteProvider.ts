import { HYPERLIQUID_ROUTES, HyperliquidDestination, HyperliquidRoute, getHyperliquidCandidates, pickHyperliquidDestination } from "./routes";
import { HYPERLIQUID_USDC_SYMBOL } from "./constants";
import { ExtendedRouteProvider, ExtendedTokenMapping, NetworkRoute, NetworkRouteToken, RealRouteRef } from "@layerswap/widget/types";

/**
 * Build an extended-route mapping from a (route, chosen destination) pair.
 * Each destination owns its own CCTP fee/timing/decimals, so the mapping varies
 * with whichever destination ends up active.
 */
const toMapping = (route: HyperliquidRoute, dest: HyperliquidDestination): ExtendedTokenMapping => ({
    extendedTokenSymbol: HYPERLIQUID_USDC_SYMBOL,
    real: { networkName: dest.realNetworkName, tokenSymbol: dest.realTokenSymbol },
    flatFee: dest.flatFee,
    extraCompletionSeconds: dest.arrivalSeconds,
    realDecimals: dest.realDecimals,
})

/** Primary-destination mappings — used by the picker's visibility filter when
 * the user hasn't selected a destination yet. The active flow uses
 * `resolveActiveMapping` instead so it picks the right destination per `to`. */
const mappings: Record<string, Record<string, ExtendedTokenMapping>> = Object.fromEntries(
    Object.entries(HYPERLIQUID_ROUTES).map(([hlNetwork, route]) => [
        hlNetwork,
        { [HYPERLIQUID_USDC_SYMBOL]: toMapping(route, route.destinations[0]) },
    ]),
)

// Cache resolved routes by the source network object so the returned route (and
// its token objects) keep stable identity across renders. Without this, every
// render produces fresh token objects, which makes RoutePicker's token-resync
// effect loop forever (it compares token identity). settings.networks is a
// stable reference for the session, so keying on it is safe.
const routeCache = new WeakMap<object, NetworkRoute>()

export const hyperliquidProvider: ExtendedRouteProvider = {
    id: 'hyperliquid',
    direction: 'source',
    extendedNetworkNames: Object.keys(HYPERLIQUID_ROUTES),
    mappings,
    resolveExtendedRoute(networkName, allNetworks) {
        const network = allNetworks.find(n => n.name === networkName)
        if (!network) return undefined

        const cached = routeCache.get(network)
        if (cached) return cached

        const tokenMapping = this.mappings[networkName]
        if (!tokenMapping) return undefined

        // Tokens from `/networks` carry no `status`; pickers filter on `status === 'active'`.
        const tokens: NetworkRouteToken[] = network.tokens
            .filter(t => !!tokenMapping[t.symbol])
            .map(t => ({ ...t, status: 'active' as const }))

        if (!tokens.length) return undefined

        const route: NetworkRoute = {
            ...network,
            deposit_methods: ['wallet'],
            tokens,
        }

        routeCache.set(network, route)
        return route
    },
    resolveActiveMapping(networkName, tokenSymbol, toNetworkName, toTokenSymbol) {
        if (tokenSymbol !== HYPERLIQUID_USDC_SYMBOL) return undefined
        const route = HYPERLIQUID_ROUTES[networkName]
        if (!route) return undefined
        const dest = pickHyperliquidDestination(networkName, toNetworkName, toTokenSymbol)
        if (!dest) return undefined
        return toMapping(route, dest)
    },
    getRealCandidates(networkName, tokenSymbol): RealRouteRef[] {
        if (tokenSymbol !== HYPERLIQUID_USDC_SYMBOL) return []
        return getHyperliquidCandidates(networkName)
    },
}
