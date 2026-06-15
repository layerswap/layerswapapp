import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";
import KnownInternalNames from "@/lib/knownIds";
import { ExtendedRouteProvider, ExtendedTokenMapping } from "../types";

const USDC = 'USDC'

/**
 * HL CCTP withdrawal (sendToEvmWithData): ~5 min arrival, 2 USDC minimum.
 * `flatFee` is the per-destination CCTP forwarding fee (Base). NOTE: verify the
 * exact Base forwarding fee — Circle's docs only quote Arbitrum (0.2 USDC).
 * When more destinations are added later, give each its own fee here.
 */
const HYPERLIQUID_MAPPING = (real: { networkName: string }): ExtendedTokenMapping => ({
    extendedTokenSymbol: USDC,
    real: { networkName: real.networkName, tokenSymbol: USDC },
    flatFee: 0.2,
    extraCompletionSeconds: 300,
    minSourceAmount: 2,
    realDecimals: 6,
    directDestinations: [{ networkName: real.networkName, tokenSymbol: USDC }],
})

// Cache resolved routes by the source network object so the returned route (and
// its token objects) keep stable identity across renders. Without this, every
// render produces fresh token objects, which makes RoutePicker's token-resync
// effect loop forever (it compares token identity). settings.networks is a
// stable reference for the session, so keying on it is safe.
const routeCache = new WeakMap<object, NetworkRoute>()

export const hyperliquidProvider: ExtendedRouteProvider = {
    id: 'hyperliquid',
    direction: 'source',
    extendedNetworkNames: [
        KnownInternalNames.Networks.HyperliquidMainnet,
        KnownInternalNames.Networks.HyperliquidTestnet,
    ],
    mappings: {
        [KnownInternalNames.Networks.HyperliquidMainnet]: {
            [USDC]: HYPERLIQUID_MAPPING({ networkName: KnownInternalNames.Networks.BaseMainnet }),
        },
        [KnownInternalNames.Networks.HyperliquidTestnet]: {
            [USDC]: HYPERLIQUID_MAPPING({ networkName: KnownInternalNames.Networks.BaseSepolia }),
        },
    },
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
