import { Network, NetworkRoute, NetworkRouteToken, NetworkWithTokens, Token } from "@/Models/Network";
import { CreateSwapParams, Quote } from "@/lib/apiClients/layerSwapApiClient";
import { SwapFormValues, SwapDirection } from "@/components/DTOs/SwapFormValues";
import { parseHmsString } from "@/components/utils/formatTime";
import { ExtendedRoutePlan, ResolvedExtendedMapping } from "./types";
import { getSourceProviders, isExtendedSourceNetwork, resolveExtendedRoutePlan } from "./registry";
import { DecimalInput, decimalToNumber, isPositiveDecimal } from "./amounts";

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
                // Show iff the active route plan can be fulfilled by the same real
                // deposit-address route that quote/create will use.
                return !!resolveExtendedRoutePlan({
                    sourceNetworkName: extendedName,
                    sourceTokenSymbol: token.symbol,
                    destinationNetworkName: values.to?.name,
                    destinationTokenSymbol: values.toAsset?.symbol,
                    availableRoutes: routes,
                })
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
    sourceAmount: DecimalInput,
): Quote | undefined {
    if (!quote?.quote) return quote
    const pricePerToken = extendedToken.price_in_usd ?? 1

    return {
        ...quote,
        quote: {
            ...quote.quote,
            source_network: extendedNetwork,
            source_token: extendedToken,
            requested_amount: decimalToNumber(sourceAmount),
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

export type ExtendedCreateSwapParamsArgs = {
    plan: ExtendedRoutePlan
    destinationNetworkName: string
    destinationTokenSymbol: string
    destinationAddress: string
    referenceId?: string
    refuel?: boolean
}

export function buildCreateSwapParamsForExtendedRoute({
    plan,
    destinationNetworkName,
    destinationTokenSymbol,
    destinationAddress,
    referenceId,
    refuel,
}: ExtendedCreateSwapParamsArgs): CreateSwapParams {
    if (!plan.realAmount) throw new Error('Extended route amount is missing')
    if (!isPositiveDecimal(plan.realAmount)) throw new Error('Extended route amount is invalid')

    return {
        amount: plan.realAmount,
        source_network: plan.mapping.real.networkName,
        source_token: plan.mapping.real.tokenSymbol,
        destination_network: destinationNetworkName,
        destination_token: destinationTokenSymbol,
        destination_address: destinationAddress,
        reference_id: referenceId,
        refuel: !!refuel,
        use_deposit_address: true,
        source_address: undefined,
        refund_address: undefined,
    }
}
