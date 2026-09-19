import { resolverService } from "@/lib/resolvers/resolverService";
import { GaslessSignParams } from "@layerswap/widget-types";
import { Network } from "@layerswap/widget-types";
import { useCallback } from "react";
import { useBeforeSwapExecution } from './useBeforeSwapExecution';

export function useGasless() {
    const beforeExecution = useBeforeSwapExecution();
    const signGaslessDeposit = useCallback(async (params: GaslessSignParams): Promise<string> => {
        await beforeExecution();
        const gaslessResolver = resolverService.getGaslessResolver();
        return gaslessResolver.signGaslessDeposit(params);
    }, [beforeExecution]);

    const isGaslessSupported = useCallback((network: Network): boolean => {
        return resolverService.getGaslessResolver().supportsNetwork(network);
    }, []);

    return { signGaslessDeposit, isGaslessSupported };
}
