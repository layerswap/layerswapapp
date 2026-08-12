import { type Wallet } from '@layerswap/widget-types';
import { resolverService } from "@/lib/resolvers/resolverService";
import { TransferProps, TransferProgress } from "@layerswap/widget-types";
import { useCallback } from "react";

export function useTransfer() {
    const executeTransfer = useCallback(async (params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string | undefined> => {
        const transferResolver = resolverService.getTransferResolver();
        return transferResolver.executeTransfer(params, wallet, onProgress);
    }, []);

    return { executeTransfer };
}
