import { KnownInternalNames, realRoutePresent } from "@layerswap/widget/internal";
import type { NetworkRoute, NetworkWithTokens, RealRouteRef } from "@layerswap/widget/types";
import { depositMethodForFunding } from "@layerswap/widget/types";
import { LIGHTER_ROUTES, pickLighterDestination } from "./routes";
import { resolveLighterNodeUrl, type LighterChain } from "./protocol";

/**
 * Static configuration for the Lighter extended withdrawal source.
 *
 * Lighter holds user collateral on its own zk L2. Withdrawal is a fast-withdraw: an
 * L2 USDC transfer to Lighter's bridge account whose memo carries the Layerswap
 * Arbitrum deposit address, after which the bridge releases USDC there and the normal
 * Layerswap route completes the destination leg (funding: 'deposit_address').
 *
 * The Lighter L2 half-signature is produced server-side by the vendored official WASM
 * signer behind `LIGHTER_RELAY_PROXY_URL`; every registration and withdrawal is
 * additionally authorized by the user's own EVM wallet signature. See ../README.md.
 */

/** Canonical network/chain/node-url/limit values are shared with the relay route. */
export {
    LIGHTER_FAST_WITHDRAW_MIN_USDC,
    LIGHTER_MAINNET_NETWORK,
    LIGHTER_NETWORKS,
    LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    LIGHTER_TESTNET_NETWORK,
    LIGHTER_USDC_DECIMALS,
    LIGHTER_USDC_MIN_TRANSFER_USDC,
    LIGHTER_USDC_SYMBOL,
    isLighterNetwork,
    resolveLighterChain,
    resolveLighterNodeUrl,
} from "./protocol";
export type { LighterChain } from "./protocol";

/** Lighter's fast-withdraw pays out to a Layerswap deposit address, so the backend
 * leg is a normal deposit-address route (contrast Polymarket's 'depository'). */
export const LIGHTER_FUNDING = 'deposit_address' as const

/**
 * Absolute URL of the Next.js relay proxy. Absolute (not a basePath-relative path) for
 * the same reason as `POLYMARKET_RELAYER_PROXY_URL`: CDN embeds run on third-party
 * origins, so a relative path would resolve against the host page. See
 * `apps/bridge/pages/api/lighter/relay.ts`.
 */
export const LIGHTER_RELAY_PROXY_URL = 'https://layerswap.io/app/api/lighter/relay'

/** Display identity for the synthesized Lighter source network (see
 * `./lighterExtendedRouteProvider`). */
export const LIGHTER_DISPLAY_NAME = 'Lighter'
export const LIGHTER_LOGO = 'https://layerswap.io/app/images/lighter.png'

/** Real token whose chain metadata (logo, decimals, USD price) the synthesized Lighter
 * source token clones from. Must be a token the backend Arbitrum network defines. */
export const LIGHTER_BASE_TOKEN_SYMBOL = KnownInternalNames.Currencies.USDC

export type LighterNetworkConfig = {
    networkName: string
    /** Real backend network the withdrawal is fulfilled through (Arbitrum). */
    baseNetworkName: string
}

export const LIGHTER_CONFIG: Record<string, LighterNetworkConfig> = Object.fromEntries(
    Object.entries(LIGHTER_ROUTES)
        .filter(([, route]) => !!route.destinations.length)
        .map(([networkName, route]) => [
            networkName,
            { networkName, baseNetworkName: route.destinations[0].realNetworkName },
        ]),
)

export type LighterConfig = {
    nodeUrl: string
    lighterChain: LighterChain
    /** Up-front fee estimate; the exact fee comes from the relay preflight. */
    quotedFastWithdrawalFee: number
    realNetworkName: string
    realTokenSymbol: string
    realDecimals: number
}

export function resolveLighterConfig(
    sourceNetworkName: string | undefined,
    networks: NetworkWithTokens[],
    toNetworkName?: string,
    toTokenSymbol?: string,
    availableRoutes?: NetworkRoute[],
): LighterConfig | undefined {
    if (!sourceNetworkName) return undefined

    const route = LIGHTER_ROUTES[sourceNetworkName]
    if (!route) return undefined

    const isRealRouteAvailable = availableRoutes
        ? (real: RealRouteRef) => realRoutePresent(availableRoutes, real, depositMethodForFunding(LIGHTER_FUNDING))
        : undefined
    const dest = pickLighterDestination(sourceNetworkName, toNetworkName, toTokenSymbol, isRealRouteAvailable)
    if (!dest) return undefined

    const network = networks.find(n => n.name === sourceNetworkName)
    const nodeUrl = resolveLighterNodeUrl(sourceNetworkName, network?.node_url)
    if (!nodeUrl) return undefined

    return {
        nodeUrl,
        lighterChain: route.lighterChain,
        quotedFastWithdrawalFee: dest.flatFee,
        realNetworkName: dest.realNetworkName,
        realTokenSymbol: dest.realTokenSymbol,
        realDecimals: dest.realDecimals,
    }
}
