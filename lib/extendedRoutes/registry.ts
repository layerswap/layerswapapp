import { NetworkRoute, NetworkWithTokens } from "@/Models/Network";
import { truncateDecimalsToFloor } from "@/components/utils/RoundDecimals";
import { ExtendedRouteProvider, ResolvedExtendedMapping } from "./types";
import { hyperliquidProvider } from "./providers/hyperliquid";

// Adding a provider = one file + one entry here.
const SOURCE_PROVIDERS: ExtendedRouteProvider[] = [hyperliquidProvider]

export function getSourceProviders(): ExtendedRouteProvider[] {
    return SOURCE_PROVIDERS
}

export function isExtendedSourceNetwork(name?: string): boolean {
    if (!name) return false
    return SOURCE_PROVIDERS.some(p => p.extendedNetworkNames.includes(name))
}

export function getExtendedMapping(networkName?: string, tokenSymbol?: string): ResolvedExtendedMapping | undefined {
    if (!networkName || !tokenSymbol) return undefined

    for (const provider of SOURCE_PROVIDERS) {
        const mapping = provider.mappings[networkName]?.[tokenSymbol]
        if (!mapping) continue

        const realDecimals = mapping.realDecimals ?? 6

        return {
            ...mapping,
            provider,
            extendedNetworkName: networkName,
            resolveMode(toNetworkName, toTokenSymbol) {
                const isDirect = !!mapping.directDestinations?.some(d =>
                    d.networkName === toNetworkName && d.tokenSymbol === toTokenSymbol)
                return isDirect ? 'direct' : 'viaDepositAddressSwap'
            },
            toRealAmount(sourceAmount) {
                return truncateDecimalsToFloor(sourceAmount - mapping.flatFee, realDecimals)
            },
            toSourceAmount(realAmount) {
                return realAmount + mapping.flatFee
            },
        }
    }

    return undefined
}

export function resolveExtendedRouteByName(name: string | undefined, networks: NetworkWithTokens[]): NetworkRoute | undefined {
    if (!name) return undefined
    const provider = SOURCE_PROVIDERS.find(p => p.extendedNetworkNames.includes(name))
    return provider?.resolveExtendedRoute(name, networks)
}
