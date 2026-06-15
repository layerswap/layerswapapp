import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import { ExtendedRouteProvider, ExtendedTokenMapping } from "../types";
import { HYPERLIQUID_ROUTES, HyperliquidRoute } from "@/lib/wallets/hyperliquid/routes";
import { HYPERLIQUID_USDC_SYMBOL } from "@/lib/wallets/hyperliquid/constants";

/**
 * Derive the extended-route mapping from the shared route table — fee, timing,
 * minimum and destination all come from HYPERLIQUID_ROUTES so adding/switching a
 * destination is a single edit there.
 */
const toMapping = (route: HyperliquidRoute): ExtendedTokenMapping => ({
    extendedTokenSymbol: HYPERLIQUID_USDC_SYMBOL,
    real: { networkName: route.realNetworkName, tokenSymbol: route.realTokenSymbol },
    flatFee: route.flatFee,
    extraCompletionSeconds: route.arrivalSeconds,
    minSourceAmount: route.minSourceAmount,
    realDecimals: route.realDecimals,
    directDestinations: [{ networkName: route.realNetworkName, tokenSymbol: route.realTokenSymbol }],
})

const mappings: Record<string, Record<string, ExtendedTokenMapping>> = Object.fromEntries(
    Object.entries(HYPERLIQUID_ROUTES).map(([hlNetwork, route]) => [
        hlNetwork,
        { [HYPERLIQUID_USDC_SYMBOL]: toMapping(route) },
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

        const route = {
            ...network,
            deposit_methods: ['wallet'],
            tokens,
        } as NetworkRoute

        routeCache.set(network, route)
        return route
    },
}
