import { useMemo } from "react";
import { useSettingsState } from "@/context/settings";
import { mergeExtendedSourceRoutes } from "@/lib/extendedRoutes/registry";
import { NetworkRoute, NetworkRouteToken } from "@/Models/Network";

const PREFERRED_SOURCE_TOKEN_SYMBOL = "USDC";

export const pickSourceToken = (route?: NetworkRoute): NetworkRouteToken | undefined =>
    route?.tokens?.find(t => t.symbol === PREFERRED_SOURCE_TOKEN_SYMBOL) ?? route?.tokens?.[0];

export function useMergedSourceRoutes(): NetworkRoute[] {
    const { sourceRoutes, networks, extendedRouteFlags } = useSettingsState();
    return useMemo(() => mergeExtendedSourceRoutes(sourceRoutes ?? [], networks, undefined, undefined, extendedRouteFlags), [sourceRoutes, networks, extendedRouteFlags]);
}

export function useSourceRoute(
    networkName?: string,
): { network: NetworkRoute; token: NetworkRouteToken } | undefined {
    const routes = useMergedSourceRoutes();
    return useMemo(() => {
        if (!networkName) return undefined;
        const network = routes.find(r => r.name === networkName);
        const token = pickSourceToken(network);
        return network && token ? { network, token } : undefined;
    }, [networkName, routes]);
}
