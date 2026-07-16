import { NetworkRoute, NetworkRouteToken, NetworkType, NetworkWithTokens, Token } from "@/Models/Network";
import { ExtendedRouteProvider, ExtendedTokenMapping, RealRouteRef, requiredDepositMethod } from "../types";
import { realRoutePresent } from "../availability";
import { LIGHTER_ROUTES, LighterDestination, getLighterCandidates, pickLighterDestination } from "@/lib/wallets/lighter/routes";
import { LIGHTER_BASE_TOKEN_SYMBOL, LIGHTER_CONFIG, LIGHTER_DISPLAY_NAME, LIGHTER_FUNDING, LIGHTER_LOGO, LIGHTER_USDC_SYMBOL } from "@/lib/wallets/lighter/constants";

const toMapping = (dest: LighterDestination): ExtendedTokenMapping => ({
    extendedTokenSymbol: LIGHTER_USDC_SYMBOL,
    real: { networkName: dest.realNetworkName, tokenSymbol: dest.realTokenSymbol },
    flatFee: dest.flatFee,
    minAmount: dest.minAmount,
    extraCompletionSeconds: dest.arrivalSeconds,
    realDecimals: dest.realDecimals,
})

const mappings: Record<string, Record<string, ExtendedTokenMapping>> = Object.fromEntries(
    Object.entries(LIGHTER_ROUTES).map(([lighterNetwork, route]) => [
        lighterNetwork,
        { [LIGHTER_USDC_SYMBOL]: toMapping(route.destinations[0]) },
    ]),
)

const networkCache = new WeakMap<object, Map<string, NetworkWithTokens>>()
const routeCache = new WeakMap<object, NetworkRoute>()

export const lighterProvider: ExtendedRouteProvider = {
    id: 'lighter',
    direction: 'source',
    funding: LIGHTER_FUNDING,
    extendedNetworkNames: Object.keys(LIGHTER_ROUTES),
    mappings,
    resolveExtendedNetwork(networkName, allNetworks) {
        const cfg = LIGHTER_CONFIG[networkName]
        if (!cfg) return undefined

        let byName = networkCache.get(allNetworks)
        if (byName?.has(networkName)) return byName.get(networkName)

        const base = allNetworks.find(n => n.name === cfg.baseNetworkName)
        if (!base) return undefined
        const baseToken = base.tokens?.find(t => t.symbol === LIGHTER_BASE_TOKEN_SYMBOL)
        if (!baseToken) return undefined

        const token: Token = { ...baseToken, symbol: LIGHTER_USDC_SYMBOL, display_asset: LIGHTER_USDC_SYMBOL }
        const synthesized: NetworkWithTokens = {
            ...base,
            name: networkName,
            display_name: LIGHTER_DISPLAY_NAME,
            logo: LIGHTER_LOGO,
            type: NetworkType.Lighter,
            deposit_methods: ['wallet'],
            tokens: [token],
        }

        if (!byName) {
            byName = new Map()
            networkCache.set(allNetworks, byName)
        }
        byName.set(networkName, synthesized)
        return synthesized
    },
    resolveExtendedRoute(networkName, allNetworks) {
        const network = allNetworks.find(n => n.name === networkName)
        if (!network) return undefined

        const cached = routeCache.get(network)
        if (cached) return cached

        const tokenMapping = this.mappings[networkName]
        if (!tokenMapping) return undefined

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
    resolveActiveMapping(networkName, tokenSymbol, toNetworkName, toTokenSymbol, availableRoutes) {
        if (tokenSymbol !== LIGHTER_USDC_SYMBOL) return undefined
        if (!LIGHTER_ROUTES[networkName]) return undefined
        const isRealRouteAvailable = availableRoutes
            ? (real: RealRouteRef) => realRoutePresent(availableRoutes, real, requiredDepositMethod(this))
            : undefined
        const dest = pickLighterDestination(networkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
        if (!dest) return undefined
        return toMapping(dest)
    },
    getRealCandidates(networkName, tokenSymbol): RealRouteRef[] {
        if (tokenSymbol !== LIGHTER_USDC_SYMBOL) return []
        return getLighterCandidates(networkName)
    },
}
