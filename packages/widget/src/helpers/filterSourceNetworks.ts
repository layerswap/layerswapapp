import { LayerSwapSettings } from "@/Models";
import { WalletConnectionProvider } from "@/types";

export function filterSourceNetworks(settings: LayerSwapSettings, walletProviders: WalletConnectionProvider[]) {
    const allNetworkTypes: string[] = [...new Set(settings.sourceRoutes?.map(route => route.type))];
    const routesByNetworkType = settings.sourceRoutes?.reduce((acc, route) => {
        if (!acc[route.type]) {
            acc[route.type] = [];
        }
        acc[route.type].push(route);
        return acc;
    }, {} as Record<string, typeof settings.sourceRoutes>) || {};

    const unavailableNetworkTypes: string[] = [];

    Object.entries(routesByNetworkType).forEach(([networkType, routes]) => {
        const walletOnlyRoutesForType = routes.filter(route => route.deposit_methods.length === 1 && route.deposit_methods[0] === "wallet");

        if (walletOnlyRoutesForType.length > 0) {
            const hasAnySupportedRoute = routes.some(route => walletProviders.some(provider => provider.withdrawalSupportedNetworks.includes(route.name)));

            if (!hasAnySupportedRoute) unavailableNetworkTypes.push(networkType);
        }
    });

    const availableNetworkTypes = allNetworkTypes.filter(type => !unavailableNetworkTypes.includes(type));

    return availableNetworkTypes;
}