import { resolverService } from "@/lib/resolvers/resolverService";
import { TransferProps, Wallet } from "@/types";
import { useCallback } from "react";

export function useTransfer() {
    const executeTransfer = useCallback(async (params: TransferProps, wallet?: Wallet): Promise<string | undefined> => {
        const transferResolver = resolverService.getTransferResolver();
        return transferResolver.executeTransfer(params, wallet);
    }, []);

    return { executeTransfer };
}
