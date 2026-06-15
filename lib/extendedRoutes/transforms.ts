import { Network, NetworkRoute, NetworkRouteToken, NetworkWithTokens, Token } from "@/Models/Network";
import { Quote } from "@/lib/apiClients/layerSwapApiClient";
import { SwapFormValues, SwapDirection } from "@/components/DTOs/SwapFormValues";
import { parseHmsString } from "@/components/utils/formatTime";
import { RealRouteRef, ResolvedExtendedMapping } from "./types";
import { getSourceProviders, isExtendedSourceNetwork } from "./registry";

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
                // Show iff the backend offers a real deposit-address route for AT
                // LEAST ONE of the provider's candidate destinations for this token
                // (primary or any fallback). Falls back to the static mapping when
                // the provider doesn't enumerate candidates.
                const candidates = provider.getRealCandidates?.(extendedName, token.symbol) ?? [mapping.real]
                return candidates.some(c => realDepositAddressRoutePresent(routes, c))
            })

            if (qualifyingTokens.length) {
                additions.push({ ...extendedRoute, tokens: qualifyingTokens })
            }
        }
    }

    return additions.length ? [...routes, ...additions] : routes
}

function injectExtendedDestinations({ routes, values }: Omit<InjectArgs, 'direction'>): NetworkRoute[] {
    if (!isExtendedSourceNetwork(values.from?.name)) return routes
    // The extended network can never be its own destination.
    return routes.filter(r => !isExtendedSourceNetwork(r.name))
}

function realDepositAddressRoutePresent(routes: NetworkRoute[], real: RealRouteRef): boolean {
    return routes.some(r =>
        r.name === real.networkName
        && r.deposit_methods?.includes('deposit_address')
        && r.tokens?.some(t => t.symbol === real.tokenSymbol && t.status === 'active'))
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

function addSecondsToHms(value: string | undefined, addSeconds: number): string {
    const parts = parseHmsString(value)
    const base = parts ? parts.hours * 3600 + parts.minutes * 60 + parts.seconds : 0
    const total = base + addSeconds
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
