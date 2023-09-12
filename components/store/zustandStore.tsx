import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { PublishedSwapTransactionStatus } from '../../lib/layerSwapApiClient';

type SwapTransactionStore = {
    swapTransactions: Record<string, any>;
    setSwapTransaction: (Id: string, status: PublishedSwapTransactionStatus, txHash: string, failReason?: string) => void;
};

export const useSwapTransactionStore = create(
    persist<SwapTransactionStore>(
        (set, get) => ({
            swapTransactions: {},
            setSwapTransaction: (Id, status, txHash, failReason) => {
                set((state) => {
                    const txForSwap = state.swapTransactions[Id] || {
                        hash: txHash,
                        status: status,
                        failReason: failReason
                    };
                    return { swapTransactions: txForSwap };
                });
            },
        }),
        {
            name: 'swapTransactions',
            storage: createJSONStorage(() => localStorage),
        }
    )
)