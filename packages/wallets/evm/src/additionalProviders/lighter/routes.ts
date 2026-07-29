import { KnownInternalNames } from "@layerswap/widget/internal";
import type { RealRouteAvailability } from "@layerswap/widget/types";
import {
    LIGHTER_FAST_WITHDRAW_MIN_USDC,
    LIGHTER_MAINNET_NETWORK,
    LIGHTER_NETWORKS,
    LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    LIGHTER_TESTNET_NETWORK,
    LIGHTER_USDC_DECIMALS,
    type LighterChain,
} from "./protocol";

export type LighterDestination = {
    realNetworkName: string
    realTokenSymbol: string
    realDecimals: number
    flatFee: number
    minAmount: number
    arrivalSeconds: number
}

export type LighterRoute = {
    lighterChain: LighterChain
    defaultNodeUrl: string
    destinations: LighterDestination[]
}

// Lighter fast withdrawals are paid out by its Arbitrum bridge. Base and
// Avalanche are supported CCTP *deposit* entry paths, not fast-withdraw
// destinations.
const ARBITRUM_MAINNET: LighterDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumMainnet,
    realTokenSymbol: KnownInternalNames.Currencies.USDC,
    realDecimals: LIGHTER_USDC_DECIMALS,
    flatFee: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    // Lighter applies its 4 USDC fast-withdraw minimum to the total entered
    // amount; the bridge transfer receives that amount minus the live fee.
    minAmount: LIGHTER_FAST_WITHDRAW_MIN_USDC,
    arrivalSeconds: 30,
}
const ARBITRUM_SEPOLIA: LighterDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumSepolia,
    realTokenSymbol: KnownInternalNames.Currencies.USDC,
    realDecimals: LIGHTER_USDC_DECIMALS,
    flatFee: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    minAmount: LIGHTER_FAST_WITHDRAW_MIN_USDC,
    arrivalSeconds: 30,
}

const DESTINATIONS: Record<string, LighterDestination[]> = {
    [LIGHTER_MAINNET_NETWORK]: [ARBITRUM_MAINNET],
    [LIGHTER_TESTNET_NETWORK]: [ARBITRUM_SEPOLIA],
}

export const LIGHTER_ROUTES: Record<string, LighterRoute> = Object.fromEntries(
    Object.entries(LIGHTER_NETWORKS).map(([networkName, network]) => [
        networkName,
        { ...network, destinations: DESTINATIONS[networkName] ?? [] },
    ]),
)

export function pickLighterDestination(
    lighterNetworkName: string | undefined,
    toNetworkName?: string,
    toTokenSymbol?: string,
    isRealRouteAvailable?: RealRouteAvailability,
): LighterDestination | undefined {
    if (!lighterNetworkName) return undefined
    const route = LIGHTER_ROUTES[lighterNetworkName]
    if (!route) return undefined

    const notSelfSwap = (d: LighterDestination) =>
        !(d.realNetworkName === toNetworkName && d.realTokenSymbol === toTokenSymbol)
    const eligible = route.destinations.filter(notSelfSwap)
    const candidates = eligible.length ? eligible : route.destinations

    if (isRealRouteAvailable) {
        const available = candidates.find(d =>
            isRealRouteAvailable({ networkName: d.realNetworkName, tokenSymbol: d.realTokenSymbol })
        )
        if (available) return available
    }

    return candidates[0]
}

export function getLighterCandidates(lighterNetworkName: string | undefined): { networkName: string; tokenSymbol: string }[] {
    if (!lighterNetworkName) return []
    const route = LIGHTER_ROUTES[lighterNetworkName]
    if (!route) return []
    return route.destinations.map(d => ({ networkName: d.realNetworkName, tokenSymbol: d.realTokenSymbol }))
}
