import { useMemo } from 'react';
import { useSwapDataState } from '../context/swap';
import { useSwapTransactionStore } from '../stores/swapTransactionStore';
import { TransactionStatus } from '../lib/apiClients/layerSwapApiClient';
import { ResolvedSwapStatus, resolveSwapPhase } from '../components/utils/resolveSwapPhase';
import { useDepositSettings } from '../context/depositSettings';

type Options = { inputTxStatusFromApi?: TransactionStatus };

export function useResolvedSwapStatus(opts: Options = {}): ResolvedSwapStatus {
    const { swapDetails, refuel } = useSwapDataState();
    const { isDepositFlow } = useDepositSettings();
    const storedWalletTransaction = useSwapTransactionStore(
        state => swapDetails?.id ? state.swapTransactions[swapDetails.id] : undefined,
    );

    return useMemo(
        () => resolveSwapPhase({
            swapDetails,
            refuel,
            inputTxStatusFromApi: opts.inputTxStatusFromApi,
            storedWalletTransaction,
            isDepositFlow,
        }),
        [swapDetails, refuel, opts.inputTxStatusFromApi, storedWalletTransaction, isDepositFlow],
    );
}
