import { Network, NetworkRoute, NetworkRouteToken, NetworkWithTokens, Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { SwapFormValues, SwapDirection } from "@/components/DTOs/SwapFormValues";
import { parseHmsString } from "@/components/utils/formatTime";
import { RealRouteRef, ResolvedExtendedMapping } from "./types";
import { getExtendedMapping, getSourceProviders, isExtendedSourceNetwork } from "./registry";

export type ExtendedLimits = {
    min_amount: number
    min_amount_in_usd: number
    max_amount: number
    max_amount_in_usd: number
}

type InjectArgs = {
    routes: NetworkRoute[]
    direction: SwapDirection
    values: SwapFormValues
    networks: NetworkWithTokens[]
}

/**
 * Append extended routes to the backend list. Upstream of all filtering/sorting,
 * so locks, grouping and suggestions keep working unchanged.
 */
export function injectExtendedRoutes({ routes, direction, values, networks }: InjectArgs): NetworkRoute[] {
    if (direction === 'from') return injectExtendedSources({ routes, values, networks })
    return injectExtendedDestinations({ routes, values, networks })
}

function injectExtendedSources({ routes, values, networks }: Omit<InjectArgs, 'direction'>): NetworkRoute[] {
    const additions: NetworkRoute[] = []

    for (const provider of getSourceProviders()) {
        for (const extendedName of provider.extendedNetworkNames) {
            // Future backend adoption = zero conflict: skip names already present.
            if (routes.some(r => r.name === extendedName)) continue
            // Can't route a network to itself.
            if (values.to?.name === extendedName) continue

            const extendedRoute = provider.resolveExtendedRoute(extendedName, networks)
            if (!extendedRoute) continue

            const tokenMappings = provider.mappings[extendedName] || {}
            const qualifyingTokens: NetworkRouteToken[] = extendedRoute.tokens.filter(token => {
                const mapping = tokenMappings[token.symbol]
                if (!mapping) return false
                // Show iff the backend offers the real deposit-address route, OR the
                // selected destination is fulfilled directly client-side.
                return realDepositAddressRoutePresent(routes, mapping.real) || directDestinationSelected(mapping, values)
            })

            if (qualifyingTokens.length) {
                additions.push({ ...extendedRoute, tokens: qualifyingTokens })
            }
        }
    }

    return additions.length ? [...routes, ...additions] : routes
}

function injectExtendedDestinations({ routes, values, networks }: Omit<InjectArgs, 'direction'>): NetworkRoute[] {
    if (!isExtendedSourceNetwork(values.from?.name)) return routes

    // The extended network can never be its own destination.
    let result = routes.filter(r => !isExtendedSourceNetwork(r.name))

    const mapping = getExtendedMapping(values.from?.name, values.fromAsset?.symbol)
    if (!mapping?.directDestinations?.length) return result

    const additions: NetworkRoute[] = []
    for (const direct of mapping.directDestinations) {
        if (result.some(r => r.name === direct.networkName && r.tokens?.some(t => t.symbol === direct.tokenSymbol))) continue
        const route = buildRealRoute(direct, networks)
        if (route) additions.push(route)
    }

    return additions.length ? [...result, ...additions] : result
}

function realDepositAddressRoutePresent(routes: NetworkRoute[], real: RealRouteRef): boolean {
    return routes.some(r =>
        r.name === real.networkName
        && r.deposit_methods?.includes('deposit_address')
        && r.tokens?.some(t => t.symbol === real.tokenSymbol && t.status === 'active'))
}

function directDestinationSelected(mapping: { directDestinations?: RealRouteRef[] }, values: SwapFormValues): boolean {
    return !!mapping.directDestinations?.some(d =>
        d.networkName === values.to?.name && d.tokenSymbol === values.toAsset?.symbol)
}

// Cache built routes by source network object + token symbol so injected direct
// destinations keep stable token identity across renders (see routeCache note in
// providers/hyperliquid.ts — otherwise RoutePicker's resync effect loops).
const realRouteCache = new WeakMap<object, Map<string, NetworkRoute>>()

function buildRealRoute(real: RealRouteRef, networks: NetworkWithTokens[]): NetworkRoute | undefined {
    const network = networks.find(n => n.name === real.networkName)
    if (!network) return undefined

    let byToken = realRouteCache.get(network)
    if (!byToken) {
        byToken = new Map()
        realRouteCache.set(network, byToken)
    }
    const cached = byToken.get(real.tokenSymbol)
    if (cached) return cached

    const token = network.tokens.find(t => t.symbol === real.tokenSymbol)
    if (!token) return undefined

    const route = {
        ...network,
        tokens: [{ ...token, status: 'active' as const }],
    } as NetworkRoute

    byToken.set(real.tokenSymbol, route)
    return route
}

/** Displayed limits = backend limits + flat fee (clamped to minSourceAmount). */
export function transformLimitsForExtendedRoute(limits: ExtendedLimits | undefined, mapping: ResolvedExtendedMapping): ExtendedLimits | undefined {
    if (!limits) return limits
    const pricePerToken =
        limits.min_amount > 0 ? limits.min_amount_in_usd / limits.min_amount
            : limits.max_amount > 0 ? limits.max_amount_in_usd / limits.max_amount
                : 1

    const min_amount = Math.max(limits.min_amount + mapping.flatFee, mapping.minSourceAmount ?? 0)
    const max_amount = limits.max_amount + mapping.flatFee

    return {
        min_amount,
        max_amount,
        min_amount_in_usd: min_amount * pricePerToken,
        max_amount_in_usd: max_amount * pricePerToken,
    }
}

/**
 * Re-denominate a backend quote so the source side reads as the extended
 * network/token: requested_amount = A, fee += flatFee, completion += extra time.
 */
export function transformQuoteForExtendedRoute(
    quote: Quote | undefined,
    mapping: ResolvedExtendedMapping,
    extendedNetwork: Network,
    extendedToken: Token,
    sourceAmount: number,
): Quote | undefined {
    if (!quote?.quote) return quote
    const pricePerToken = extendedToken.price_in_usd ?? 1

    return {
        ...quote,
        quote: {
            ...quote.quote,
            source_network: extendedNetwork,
            source_token: extendedToken,
            requested_amount: sourceAmount,
            total_fee: quote.quote.total_fee + mapping.flatFee,
            total_fee_in_usd: quote.quote.total_fee_in_usd + mapping.flatFee * pricePerToken,
            avg_completion_time: addSecondsToHms(quote.quote.avg_completion_time, mapping.extraCompletionSeconds),
        },
    }
}

/** Local quote for direct mode (no backend call): receive = A - fee, time = 5 min. */
export function buildDirectQuote(
    mapping: ResolvedExtendedMapping,
    sourceNetwork: Network,
    sourceToken: Token,
    destinationNetwork: Network,
    destinationToken: Token,
    sourceAmount: number,
): Quote {
    const receive = mapping.toRealAmount(sourceAmount)
    const pricePerToken = sourceToken.price_in_usd ?? 1

    return {
        quote: {
            source_network: sourceNetwork,
            source_token: sourceToken,
            destination_network: destinationNetwork,
            destination_token: destinationToken,
            requested_amount: sourceAmount,
            receive_amount: receive,
            min_receive_amount: receive,
            total_fee: mapping.flatFee,
            total_fee_in_usd: mapping.flatFee * pricePerToken,
            blockchain_fee: mapping.flatFee,
            service_fee: 0,
            avg_completion_time: addSecondsToHms(undefined, mapping.extraCompletionSeconds),
            rate: 1,
        },
    }
}

function addSecondsToHms(value: string | undefined, addSeconds: number): string {
    const parts = parseHmsString(value)
    const base = parts ? parts.hours * 3600 + parts.minutes * 60 + parts.seconds : 0
    const total = base + addSeconds
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
