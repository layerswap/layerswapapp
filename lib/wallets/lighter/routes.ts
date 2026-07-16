import KnownInternalNames from "@/lib/knownIds";
import type { RealRouteAvailability } from "@/lib/extendedRoutes/types";

export type LighterDestination = {
    realNetworkName: string
    realTokenSymbol: string
    realDecimals: number
    flatFee: number
    minAmount: number
    arrivalSeconds: number
}

export type LighterRoute = {
    lighterChain: 'Mainnet' | 'Testnet'
    defaultNodeUrl: string
    destinations: LighterDestination[]
}

const MAINNET_NODE = "https://mainnet.zklighter.elliot.ai"
const TESTNET_NODE = "https://testnet.zklighter.elliot.ai"

// Lighter fast withdrawals are paid out by its Arbitrum bridge. Base and
// Avalanche are supported CCTP *deposit* entry paths, not fast-withdraw
// destinations. Lighter only reveals the account-specific fast-withdraw fee
// after authorization, so this is an initial quote estimate. The exact fee is
// confirmed before swap creation and persisted with the resulting swap.
export const LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC = 1
export const LIGHTER_FAST_WITHDRAW_MIN_USDC = 4
export const LIGHTER_USDC_MIN_TRANSFER_USDC = 1

const ARBITRUM_MAINNET: LighterDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumMainnet,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    flatFee: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    // Lighter applies its 4 USDC fast-withdraw minimum to the total entered
    // amount; the bridge transfer receives that amount minus the live fee.
    minAmount: LIGHTER_FAST_WITHDRAW_MIN_USDC,
    arrivalSeconds: 30,
}
const ARBITRUM_SEPOLIA: LighterDestination = {
    realNetworkName: KnownInternalNames.Networks.ArbitrumSepolia,
    realTokenSymbol: 'USDC',
    realDecimals: 6,
    flatFee: LIGHTER_QUOTED_FAST_WITHDRAW_FEE_USDC,
    minAmount: LIGHTER_FAST_WITHDRAW_MIN_USDC,
    arrivalSeconds: 30,
}

export const LIGHTER_ROUTES: Record<string, LighterRoute> = {
    [KnownInternalNames.Networks.LighterMainnet]: {
        lighterChain: 'Mainnet',
        defaultNodeUrl: MAINNET_NODE,
        destinations: [ARBITRUM_MAINNET],
    },
    [KnownInternalNames.Networks.LighterTestnet]: {
        lighterChain: 'Testnet',
        defaultNodeUrl: TESTNET_NODE,
        destinations: [ARBITRUM_SEPOLIA],
    },
}

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
