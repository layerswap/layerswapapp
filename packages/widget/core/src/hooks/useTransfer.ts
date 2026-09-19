import { type Wallet } from '@layerswap/widget-types';
import { resolverService } from "@/lib/resolvers/resolverService";
import { TransferProps, TransferProgress } from "@layerswap/widget-types";
import { useCallback } from "react";
import { useBeforeSwapExecution } from './useBeforeSwapExecution';

export function useTransfer() {
    const beforeExecution = useBeforeSwapExecution();
    const executeTransfer = useCallback(async (params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string | undefined> => {
        await beforeExecution(params.swapId);
        const transferResolver = resolverService.getTransferResolver();
        return transferResolver.executeTransfer(params, wallet, onProgress);
    }, [beforeExecution]);

    return { executeTransfer };
}
