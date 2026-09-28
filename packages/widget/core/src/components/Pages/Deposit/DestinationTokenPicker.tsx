import { FC, useMemo } from "react";
import { useSettingsState } from "@/context/settings";
import { NetworkRoute, NetworkRouteToken } from "@layerswap/widget-types";
import { useDepositSelection } from "./depositSelectionContext";

import { DestinationTokenPickerView } from "./DestinationTokenPickerView";

export type SupportedDestination = {
    /** Network `name` (canonical identifier like `BASE_MAINNET`). */
    network: string;
    /** Token symbols (case-insensitive, e.g. `["USDC", "USDT"]`). The user picks
     * one of these via the token dropdown; the network is fixed. */
    tokens: string[];
};

export type ResolvedDestination = {
    network: NetworkRoute;
    token: NetworkRouteToken;
};

/**
 * Resolves the integrator-provided destination (a single network plus its
 * allowed token symbols) into the full `NetworkRoute` + `NetworkRouteToken`
 * objects from settings, one entry per token. Tokens that don't match an
 * active token in settings are dropped.
 */
export function useResolvedDestinations(destination: SupportedDestination): ResolvedDestination[] {
    const settings = useSettingsState();
    return useMemo(() => {
        const routes = settings.destinationRoutes ?? [];
        const network = routes.find(r => r.name.toLowerCase() === destination.network.toLowerCase());
        if (!network) return [];
        const out: ResolvedDestination[] = [];
        for (const symbol of destination.tokens) {
            const token = network.tokens?.find(
                t => t.symbol.toUpperCase() === symbol.toUpperCase() && t.status === "active",
            );
            if (!token) continue;
            out.push({ network, token });
        }
        return out;
    }, [settings.destinationRoutes, destination]);
}

const DestinationTokenPicker: FC = () => {
    const { resolved, destination, destinationToken, setSelection } = useDepositSelection();
    return <DestinationTokenPickerView resolved={resolved} destination={destination} destinationToken={destinationToken} onSelect={r => setSelection(r.network, r.token)} />;
};

export default DestinationTokenPicker;
