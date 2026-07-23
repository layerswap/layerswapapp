import { AvailableSourceNetworkTypes, LayerSwapSettings } from "@/Models";
import { WalletConnectionProvider } from "@/types";


export function filterSourceNetworks(settings: LayerSwapSettings, walletProviders: WalletConnectionProvider[]): AvailableSourceNetworkTypes {

    const networkTypesAggregation = settings.sourceRoutes?.reduce((acc, route) => {
        if (!acc[route.type]) {
            acc[route.type] = [];
        }
        acc[route.type].push(route);
        return acc;
    }, {} as Record<string, typeof settings.sourceRoutes>) || {}

    const allNetworkTypes = Object.keys(networkTypesAggregation)

    const availableNetworkTypes = allNetworkTypes.filter(networkType => {
        return networkTypesAggregation[networkType].some(route => route.deposit_methods.includes("deposit_address") ||
            walletProviders.some(provider => provider.withdrawalSupportedNetworks.includes(route.name))
        )
    })

    if (availableNetworkTypes.length === allNetworkTypes.length) {
        return {
            all: true,
        }
    }

    return {
        all: false,
        networks: availableNetworkTypes
    }
}