import { LayerSwapSettings } from "@/Models";
import { WalletConnectionProvider } from "@/types";

export function filterSourceNetworks(settings: LayerSwapSettings, walletProviders: WalletConnectionProvider[]) {
    const walletOnlyRoutes = settings.sourceRoutes?.filter(sourceRoute => sourceRoute.deposit_methods.length === 1 && sourceRoute.deposit_methods[0] === "wallet") || [];
    const allNetworkTypes: string[] = [...new Set(settings.sourceRoutes?.map(route => route.type))];

    const unavailableNetworkTypes: string[] = [];

    walletOnlyRoutes.forEach(route => {
        const isUnsupportedByAll = walletProviders.every(provider => !provider.withdrawalSupportedNetworks.includes(route.name));

        if (isUnsupportedByAll && !unavailableNetworkTypes.includes(route.type)) {
            unavailableNetworkTypes.push(route.type);
        }
    });

    const availableNetworkTypes = allNetworkTypes.filter(type => !unavailableNetworkTypes.includes(type));

    return availableNetworkTypes;
}