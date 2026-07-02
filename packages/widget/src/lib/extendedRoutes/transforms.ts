import { Network, Token } from "@/Models/Network";
import { CreateSwapParams, Quote } from "@/lib/apiClients/layerSwapApiClient";
import { parseHmsString } from "@/components/utils/formatTime";
import { ExtendedRoutePlan, ResolvedExtendedMapping } from "./types";
import { DecimalInput, decimalToNumber, isPositiveDecimal } from "./amounts";

export type ExtendedLimits = {
    min_amount: number
    min_amount_in_usd: number
    max_amount: number
    max_amount_in_usd: number
}

/** Displayed limits = backend limits + flat fee (the min is resolved dynamically
 * off the backend min, not a static floor). */
export function transformLimitsForExtendedRoute(limits: ExtendedLimits | undefined, mapping: ResolvedExtendedMapping): ExtendedLimits | undefined {
    if (!limits) return limits
    const pricePerToken =
        limits.min_amount > 0 ? limits.min_amount_in_usd / limits.min_amount
            : limits.max_amount > 0 ? limits.max_amount_in_usd / limits.max_amount
                : 1

    const min_amount = limits.min_amount + mapping.flatFee
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
            blockchain_fee: quote.quote.blockchain_fee + mapping.flatFee,
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
