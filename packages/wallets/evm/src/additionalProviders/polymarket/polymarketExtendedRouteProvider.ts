import { NetworkRoute, NetworkRouteToken, NetworkType, NetworkWithTokens, Token, ExtendedRouteProvider, ExtendedTokenMapping, RealRouteRef, requiredDepositMethod } from "@layerswap/widget/types";
import { realRoutePresent } from "@layerswap/widget/internal";
import { getPolymarketCandidates, pickPolymarketDestination, POLYMARKET_CONFIG, POLYMARKET_DISPLAY_SYMBOL, PolymarketConfig } from "./routes";
import { POLYMARKET_BASE_TOKEN_SYMBOL, POLYMARKET_DISPLAY_NAME, POLYMARKET_LOGO, POLYMARKET_PUSD_ADDRESS } from "./constants";

/**
 * Polymarket extended SOURCE provider. Unlike Hyperliquid (which the backend
 * defines), Polymarket is synthesized entirely on the client from the real Polygon
 * network — see `resolveExtendedNetwork`. Its withdrawal unwraps pUSD → USDC.e 1:1 and
 * deposits into the Layerswap Depository on Polygon (funding: 'depository'); the backend
 * then bridges to the final destination.
 */

const toMapping = (cfg: PolymarketConfig): ExtendedTokenMapping => ({
    extendedTokenSymbol: POLYMARKET_DISPLAY_SYMBOL,
    real: { networkName: cfg.realNetworkName, tokenSymbol: cfg.realTokenSymbol },
    flatFee: cfg.flatFee,
    extraCompletionSeconds: cfg.arrivalSeconds,
    realDecimals: cfg.realDecimals,
})

const mappings: Record<string, Record<string, ExtendedTokenMapping>> = Object.fromEntries(
    Object.entries(POLYMARKET_CONFIG).map(([name, cfg]) => [
        name,
        { [POLYMARKET_DISPLAY_SYMBOL]: toMapping(cfg) },
    ]),
)

const networkCache = new WeakMap<object, Map<string, NetworkWithTokens>>()
const routeCache = new WeakMap<object, NetworkRoute>()

export const polymarketProvider: ExtendedRouteProvider = {
    id: 'polymarket',
    direction: 'source',
    // Fail closed: withdrawal depends on the gated relayer proxy and builder
    // creds, so when no resolved flag covers this provider (flags endpoint
    // unreachable) the route must stay hidden rather than break mid-flow.
    enabledByDefault: false,
    funding: 'depository',
    requiresRefundAddress: true,
    extendedNetworkNames: Object.keys(POLYMARKET_CONFIG),
    mappings,
    resolveExtendedNetwork(networkName, allNetworks) {
        const cfg = POLYMARKET_CONFIG[networkName]
        if (!cfg) return undefined

        let byName = networkCache.get(allNetworks)
        if (byName?.has(networkName)) return byName.get(networkName)

        const base = allNetworks.find(n => n.name === cfg.realNetworkName)
        if (!base) return undefined
        const baseToken = base.tokens?.find(t => t.symbol === POLYMARKET_BASE_TOKEN_SYMBOL)
        if (!baseToken) return undefined

        const token: Token = {
            ...baseToken,
            symbol: POLYMARKET_DISPLAY_SYMBOL,
            display_asset: POLYMARKET_DISPLAY_SYMBOL,
            contract: POLYMARKET_PUSD_ADDRESS,
        }
        const synthesized: NetworkWithTokens = {
            ...base,
            name: networkName,
            display_name: POLYMARKET_DISPLAY_NAME,
            logo: POLYMARKET_LOGO,
            type: NetworkType.Polymarket,
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
        if (tokenSymbol !== POLYMARKET_DISPLAY_SYMBOL) return undefined
        if (!POLYMARKET_CONFIG[networkName]) return undefined
        const isRealRouteAvailable = availableRoutes
            ? (real: RealRouteRef) => realRoutePresent(availableRoutes, real, requiredDepositMethod(this))
            : undefined
        const cfg = pickPolymarketDestination(networkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
        if (!cfg) return undefined
        return toMapping(cfg)
    },
    getRealCandidates(networkName, tokenSymbol): RealRouteRef[] {
        if (tokenSymbol !== POLYMARKET_DISPLAY_SYMBOL) return []
        return getPolymarketCandidates(networkName)
    },
}
