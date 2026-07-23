import { resolverService } from "@/lib/resolvers/resolverService";
import { GaslessSignParams } from "@/types";
import { Network } from "@/Models/Network";
import { useCallback } from "react";

export function useGasless() {
    const signGaslessDeposit = useCallback(async (params: GaslessSignParams): Promise<string> => {
        const gaslessResolver = resolverService.getGaslessResolver();
        return gaslessResolver.signGaslessDeposit(params);
    }, []);

    const isGaslessSupported = useCallback((network: Network): boolean => {
        return resolverService.getGaslessResolver().supportsNetwork(network);
    }, []);

    return { signGaslessDeposit, isGaslessSupported };
}
