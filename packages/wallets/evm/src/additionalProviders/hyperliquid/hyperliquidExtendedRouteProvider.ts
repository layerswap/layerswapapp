import { HYPERLIQUID_ROUTES, HyperliquidDestination, getHyperliquidCandidates, pickHyperliquidDestination } from "./routes";
import { HYPERLIQUID_FUNDING, HYPERLIQUID_USDC_SYMBOL } from "./constants";
import { NetworkRoute, NetworkRouteToken, realRoutePresent } from "@layerswap/utils";
import { DepositRouteRef, ExtendedRouteProvider, ExtendedTokenMapping, RealRouteRef, requiredDepositMethod } from "@layerswap/wallet-core/types";

/**
 * Build an extended-route mapping from a chosen destination.
 * Each destination owns its own CCTP fee/timing/decimals, so the mapping varies
 * with whichever destination ends up active.
 */
const toMapping = (dest: HyperliquidDestination): ExtendedTokenMapping => ({
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
        { [HYPERLIQUID_USDC_SYMBOL]: toMapping(route.destinations[0]) },
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
    // Pure client-side synthesis over backend-defined networks — safe to fail open
    // when no resolved flag reaches the client.
    enabledByDefault: true,
    funding: HYPERLIQUID_FUNDING,
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
    resolveActiveMapping(networkName, tokenSymbol, toNetworkName, toTokenSymbol, availableRoutes) {
        if (tokenSymbol !== HYPERLIQUID_USDC_SYMBOL) return undefined
        const route = HYPERLIQUID_ROUTES[networkName]
        if (!route) return undefined
        // When the caller knows the backend routes, let the picker fall back past
        // destinations the backend doesn't currently offer (e.g. AVAX/Sonic).
        const isRealRouteAvailable = availableRoutes
            ? (real: RealRouteRef) => realRoutePresent(availableRoutes, real, requiredDepositMethod(this))
            : undefined
        const dest = pickHyperliquidDestination(networkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
        if (!dest) return undefined
        return toMapping(dest)
    },
    getRealCandidates(networkName, tokenSymbol): DepositRouteRef[] {
        if (tokenSymbol !== HYPERLIQUID_USDC_SYMBOL) return []
        return getHyperliquidCandidates(networkName)
    },
}
