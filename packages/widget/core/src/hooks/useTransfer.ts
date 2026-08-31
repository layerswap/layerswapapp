import type {
    AuthorizeWithdrawalProps,
    TransferProgress,
    TransferProps,
    Wallet,
    WithdrawalAuthorization,
} from '@layerswap/widget-types';
import { resolverService } from "@/lib/resolvers/resolverService";
import { useCallback } from "react";

export function useTransfer() {
    const executeTransfer = useCallback(async (params: TransferProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<string | undefined> => {
        const transferResolver = resolverService.getTransferResolver();
        return transferResolver.executeTransfer(params, wallet, onProgress);
    }, []);

    // Resolves to undefined when the source's provider needs no pre-swap authorization.
    const authorizeWithdrawal = useCallback(async (params: AuthorizeWithdrawalProps, wallet?: Wallet, onProgress?: (info: TransferProgress | undefined) => void): Promise<WithdrawalAuthorization | undefined> => {
        const transferResolver = resolverService.getTransferResolver();
        return transferResolver.authorizeWithdrawal(params, wallet, onProgress);
    }, []);

    return { executeTransfer, authorizeWithdrawal };
}
