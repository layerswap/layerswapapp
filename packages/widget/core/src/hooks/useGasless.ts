import { useWalletProvidersRegistry } from "@layerswap/wallet-core";
import { resolverService } from "@/lib/resolvers/resolverService";
import { GaslessSignParams } from "@layerswap/widget-types";
import { Network } from "@layerswap/widget-types";
import { useCallback, useSyncExternalStore } from "react";
import { useBeforeSwapExecution } from './useBeforeSwapExecution';

export function useGasless() {
    const beforeExecution = useBeforeSwapExecution();
    const registry = useWalletProvidersRegistry();
    const entries = useSyncExternalStore(registry.subscribe, registry.getEntries, registry.getEntries);
    const signGaslessDeposit = useCallback(async (params: GaslessSignParams): Promise<string> => {
        await beforeExecution();
        const gaslessResolver = resolverService.getGaslessResolver();
        return gaslessResolver.signGaslessDeposit(params);
    }, [beforeExecution]);

    const isGaslessSupported = useCallback((network: Network): boolean => {
        // Direct swap links check support on their first render, before the
        // resolver-registration effect has run.
        return entries.length > 0 && resolverService.getGaslessResolver().supportsNetwork(network);
    }, [entries]);

    return { signGaslessDeposit, isGaslessSupported };
}
