import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { DecimalInput } from "./amounts";

/**
 * Extended routes are swap routes the client can execute even though the
 * backend's `/sources` & `/destinations` don't list them. Each is described by
 * a provider file and wired through the registry — no scattered `if (network)`
 * checks. See `.context/plans/extended-routes-system-hyperliquid-source-withdraw.md`.
 */

export type RealRouteRef = { networkName: string; tokenSymbol: string }

export type ExtendedTokenMapping = {
    /** Token symbol on the extended network, e.g. 'USDC' on HYPERLIQUID_*. */
    extendedTokenSymbol: string
    /** The real backend route this extended token is fulfilled through. */
    real: RealRouteRef
    /** Flat fee charged on top of the backend route, in source-token units. */
    flatFee: number
    /** Extra completion time added to the backend quote, in seconds. */
    extraCompletionSeconds: number
    /** Decimal places of the real token; used to truncate the forwarded amount. */
    realDecimals?: number
    /** Provider-imposed minimum (source-token units) applied as a floor on the
     * displayed/validated min, on top of the backend min + flat fee — e.g. the
     * Polymarket bridge's minimum checkout. Optional; absent = no extra floor. */
    minAmount?: number
}

export interface ExtendedRouteProvider {
    /** Stable id, e.g. 'hyperliquid'. */
    id: string
    /** 'destination' is designed into the types but not implemented in v1. */
    direction: 'source' | 'destination'
    /** Extended network names this provider owns, e.g. [HYPERLIQUID_MAINNET, HYPERLIQUID_TESTNET]. */
    extendedNetworkNames: string[]
    funding?: 'deposit_address' | 'depository'
    requiresRefundAddress?: boolean
    /** mappings[networkName][tokenSymbol] -> token mapping (for the primary
     * destination, used by the picker visibility check). */
    mappings: Record<string, Record<string, ExtendedTokenMapping>>
    /**
     * Build an injectable NetworkRoute from settings.networks. Returns undefined
     * when the network is absent (e.g. testnet on a prod settings payload).
     */
    resolveExtendedRoute(networkName: string, allNetworks: NetworkWithTokens[]): NetworkRoute | undefined
    /**
     * Synthesize the extended network as a full `NetworkWithTokens` from the real
     * base network in settings, for providers whose network the backend does NOT
     * define (e.g. Polymarket). Injected into `settings.networks` once at inflation
     * so the route resolver, source skin, and balance prioritization all resolve it
     * uniformly. Returns undefined when the base network is absent. Optional — when
     * absent (e.g. Hyperliquid, which the backend defines), nothing is injected.
     */
    resolveExtendedNetwork?(networkName: string, allNetworks: NetworkWithTokens[]): NetworkWithTokens | undefined
    /**
     * Resolve the mapping for a specific (extended source, token, destination).
     * Lets providers with multiple destination candidates (e.g. HL primary +
     * fallback) pick the right one based on the user's selected destination.
     * `availableRoutes`, when supplied, lets the provider skip candidates whose
     * real route the backend can't currently fulfill (availability fallback).
     * Optional — if absent, the registry uses the static `mappings` entry.
     */
    resolveActiveMapping?(networkName: string, tokenSymbol: string, toNetworkName?: string, toTokenSymbol?: string, availableRoutes?: NetworkRoute[]): ExtendedTokenMapping | undefined
    /**
     * Real (network, token) candidates for an extended (source, token) pair.
     * The picker uses this to show the extended source iff AT LEAST ONE
     * candidate has a backend deposit-address route. Optional — defaults to
     * the primary `mappings[…][…].real`.
     */
    getRealCandidates?(networkName: string, tokenSymbol: string): RealRouteRef[]
}

export type ResolvedExtendedMapping = ExtendedTokenMapping & {
    provider: ExtendedRouteProvider
    extendedNetworkName: string
    /** A - flatFee, truncated to the real token's decimals (what arrives at the deposit address). */
    toRealAmount(sourceAmount: DecimalInput): string
    /** realAmount + flatFee (what must leave the extended source). */
    toSourceAmount(realAmount: DecimalInput): string
}

export type ExtendedRoutePlan = {
    mapping: ResolvedExtendedMapping
    sourceAmount?: string
    realAmount?: string
}

export function usesDepository(provider: ExtendedRouteProvider): boolean {
    return provider.funding === 'depository'
}

export function depositMethodForFunding(funding: ExtendedRouteProvider['funding']): string {
    return funding === 'depository' ? 'wallet' : 'deposit_address'
}

export function requiredDepositMethod(provider: ExtendedRouteProvider): string {
    return depositMethodForFunding(provider.funding)
}

/**
 * Destination-side semantics (no v1 provider, designed for later):
 * an extended destination D maps to real destination R; the backend swap
 * delivers to the user's own address on R, then a provider-supplied
 * completion-step component executes the post-hop (e.g. deposit into a
 * destination protocol's contract). The registry/quote/creation seams branch by `direction`, so adding
 * it later means a new provider + one completion-step dispatch.
 */
