import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BackendTransactionStatus, TransactionStatus } from '../lib/apiClients/layerSwapApiClient';

export type SwapTransaction = {
    hash: string;
    status: BackendTransactionStatus | TransactionStatus;
    failReason?: string;
    timestamp: number;
};

type SwapTransactionStore = {
    swapTransactions: Record<string, SwapTransaction>;
    setSwapTransaction: (Id: string, status: BackendTransactionStatus | TransactionStatus, txHash: string, failReason?: string) => void;
    removeSwapTransaction: (Id: string) => void;
};

type SwapDepositHintClickedStore = {
    swapTransactions: Record<string, boolean>;
    setSwapDepositHintClicked: (Id: string) => void;
};

export type GaslessAuthorization = {
    // EIP-3009 signature expiry (unix seconds). After this passes with no input tx
    // on the swap, the paymaster failed to publish in time and the user must retry.
    validBefore: number;
};

type GaslessAuthorizationStore = {
    authorizations: Record<string, GaslessAuthorization>;
    setGaslessAuthorization: (Id: string, validBefore: number) => void;
    removeGaslessAuthorization: (Id: string) => void;
};


export const useSwapTransactionStore = create(
    persist<SwapTransactionStore>(
        (set) => ({
            swapTransactions: {},
            setSwapTransaction: (Id, status, txHash, failReason) => {
                set((state) => {
                    const txForSwap = {
                        ...state.swapTransactions,
                        [Id]: {
                            hash: txHash,
                            status: status,
                            failReason: failReason,
                            timestamp: Date.now()
                        }
                    };
                    return { swapTransactions: txForSwap };
                });
            },
            removeSwapTransaction: (id) => {
                set((state) => {
                    const { [id]: deletedTransaction, ...remainingTransactions } = state.swapTransactions;
                    return { swapTransactions: remainingTransactions };
                });
            },
        }),
        {
            name: 'swapTransactions',
            storage: createJSONStorage(() => localStorage),
        }
    ),
)

export const useGaslessAuthorizationStore = create(
    persist<GaslessAuthorizationStore>(
        (set) => ({
            authorizations: {},
            setGaslessAuthorization: (Id, validBefore) => {
                set((state) => ({
                    authorizations: {
                        ...state.authorizations,
                        [Id]: { validBefore },
                    },
                }));
            },
            removeGaslessAuthorization: (Id) => {
                set((state) => {
                    const { [Id]: _removed, ...remaining } = state.authorizations;
                    return { authorizations: remaining };
                });
            },
        }),
        {
            name: 'gaslessAuthorizations',
            storage: createJSONStorage(() => localStorage),
        }
    ),
)

export const useSwapDepositHintClicked = create(
    persist<SwapDepositHintClickedStore>(
        (set, get) => ({
            swapTransactions: {},
            setSwapDepositHintClicked: (Id) => {
                set((state) => {
                    const txForSwap = {
                        ...state.swapTransactions,
                        [Id]: true
                    };
                    return { swapTransactions: txForSwap };
                });
            },
        }),
        {
            name: 'swapDepositHintClicked',
            storage: createJSONStorage(() => sessionStorage),
        }
    ),
)