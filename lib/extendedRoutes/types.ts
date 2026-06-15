import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";

/**
 * Extended routes are swap routes the client can execute even though the
 * backend's `/sources` & `/destinations` don't list them. Each is described by
 * a provider file and wired through the registry — no scattered `if (network)`
 * checks. See `.context/plans/extended-routes-system-hyperliquid-source-withdraw.md`.
 */

export type RealRouteRef = { networkName: string; tokenSymbol: string }

export type ExtendedFulfillmentMode = 'viaDepositAddressSwap' | 'direct'

export type ExtendedTokenMapping = {
    /** Token symbol on the extended network, e.g. 'USDC' on HYPERLIQUID_*. */
    extendedTokenSymbol: string
    /** The real backend route this extended token is fulfilled through. */
    real: RealRouteRef
    /** Flat fee charged on top of the backend route, in source-token units. */
    flatFee: number
    /** Extra completion time added to the backend quote, in seconds. */
    extraCompletionSeconds: number
    /** Minimum amount that may leave the extended source (source-token units). */
    minSourceAmount?: number
    /** Decimal places of the real token; used to truncate the forwarded amount. */
    realDecimals?: number
    /** Pairs fulfilled entirely client-side (no backend swap), e.g. HL/USDC -> BASE/USDC. */
    directDestinations?: RealRouteRef[]
}

export interface ExtendedRouteProvider {
    /** Stable id, e.g. 'hyperliquid'. */
    id: string
    /** 'destination' is designed into the types but not implemented in v1. */
    direction: 'source' | 'destination'
    /** Extended network names this provider owns, e.g. [HYPERLIQUID_MAINNET, HYPERLIQUID_TESTNET]. */
    extendedNetworkNames: string[]
    /** mappings[networkName][tokenSymbol] -> token mapping. */
    mappings: Record<string, Record<string, ExtendedTokenMapping>>
    /**
     * Build an injectable NetworkRoute from settings.networks. Returns undefined
     * when the network is absent (e.g. testnet on a prod settings payload).
     */
    resolveExtendedRoute(networkName: string, allNetworks: NetworkWithTokens[]): NetworkRoute | undefined
}

export type ResolvedExtendedMapping = ExtendedTokenMapping & {
    provider: ExtendedRouteProvider
    extendedNetworkName: string
    /** 'direct' when the selected destination matches a `directDestinations` entry. */
    resolveMode(toNetworkName?: string, toTokenSymbol?: string): ExtendedFulfillmentMode
    /** A - flatFee, truncated to the real token's decimals (what arrives at the deposit address). */
    toRealAmount(sourceAmount: number): number
    /** realAmount + flatFee (what must leave the extended source). */
    toSourceAmount(realAmount: number): number
}

/**
 * Destination-side semantics (no v1 provider, designed for later):
 * an extended destination D maps to real destination R; the backend swap
 * delivers to the user's own address on R, then a provider-supplied
 * completion-step component executes the post-hop (e.g. deposit into a
 * destination protocol's contract). The registry/quote/creation seams branch by `direction`, so adding
 * it later means a new provider + one completion-step dispatch.
 */
