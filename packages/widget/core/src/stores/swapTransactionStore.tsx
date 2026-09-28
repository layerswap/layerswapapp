import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BackendTransactionStatus, GaslessAuthorizationStatus, GaslessAuthorizationTransaction, TransactionStatus } from '../lib/apiClients/layerSwapApiClient';

export type SwapTransaction = {
    hash: string;
    status: BackendTransactionStatus | TransactionStatus;
    failReason?: string;
    timestamp: number;
};

type SwapTransactionStore = {
    swapTransactions: Record<string, SwapTransaction>;
    // Provider requests whose outcome is unknown; these must be reconciled before retrying.
    pendingSubmissions: Record<string, true>;
    markSubmissionPending: (Id: string) => void;
    clearPendingSubmission: (Id: string) => void;
    setSwapTransaction: (Id: string, status: BackendTransactionStatus | TransactionStatus, txHash: string, failReason?: string) => void;
    removeSwapTransaction: (Id: string) => void;
};

type SwapDepositHintClickedStore = {
    swapTransactions: Record<string, boolean>;
    setSwapDepositHintClicked: (Id: string) => void;
};

export type GaslessAuthorization = {
    // Absent on older clients, which also stored self-paid prerequisites here.
    kind?: 'gasless';
    // Signature expiry (unix seconds); fallback deadline when the authorize poll is unreachable.
    validBefore: number;
    status?: GaslessAuthorizationStatus;
    transaction?: GaslessAuthorizationTransaction | null;
};

export type DepositSignature = { validBefore: number };

type DepositSignatureStore = {
    signatures: Record<string, DepositSignature>;
    setDepositSignature: (id: string, validBefore: number) => void;
    removeDepositSignature: (id: string) => void;
};

// A prerequisite (or an as-yet unclassified signature) must never start gasless expiry.
export const useDepositSignatureStore = create(persist<DepositSignatureStore>(
    set => ({
        signatures: {},
        setDepositSignature: (id, validBefore) => set(state => ({
            signatures: { ...state.signatures, [id]: { validBefore } },
        })),
        removeDepositSignature: id => set(state => {
            if (!state.signatures[id]) return state;
            const { [id]: removed, ...signatures } = state.signatures;
            return { signatures };
        }),
    }),
    { name: 'depositSignatures', storage: createJSONStorage(() => localStorage) },
));

type GaslessAuthorizationStore = {
    authorizations: Record<string, GaslessAuthorization>;
    setGaslessAuthorization: (Id: string, validBefore: number) => void;
    setGaslessAuthorizationStatus: (Id: string, status: GaslessAuthorizationStatus, transaction?: GaslessAuthorizationTransaction | null) => void;
    removeGaslessAuthorization: (Id: string) => void;
};


export const useSwapTransactionStore = create(
    persist<SwapTransactionStore>(
        (set) => ({
            swapTransactions: {},
            pendingSubmissions: {},
            markSubmissionPending: (Id) => {
                set((state) => ({
                    pendingSubmissions: { ...state.pendingSubmissions, [Id]: true },
                }));
            },
            clearPendingSubmission: (Id) => {
                set((state) => {
                    const { [Id]: _removed, ...pendingSubmissions } = state.pendingSubmissions;
                    return { pendingSubmissions };
                });
            },
            setSwapTransaction: (Id, status, txHash, failReason) => {
                set((state) => {
                    const { [Id]: _removed, ...pendingSubmissions } = state.pendingSubmissions;
                    const txForSwap = {
                        ...state.swapTransactions,
                        [Id]: {
                            hash: txHash,
                            status: status,
                            failReason: failReason,
                            timestamp: Date.now()
                        }
                    };
                    return { swapTransactions: txForSwap, pendingSubmissions };
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
                        [Id]: { kind: 'gasless', validBefore },
                    },
                }));
            },
            setGaslessAuthorizationStatus: (Id, status, transaction) => {
                set((state) => {
                    // A late poll response must not resurrect an authorization that
                    // retry cleanup already removed — recreating it with validBefore: 0
                    // would immediately re-expire the fresh attempt.
                    const current = state.authorizations[Id];
                    if (!current) return state;
                    return {
                        authorizations: {
                            ...state.authorizations,
                            [Id]: {
                                ...current,
                                status,
                                transaction: transaction ?? current.transaction ?? null,
                            },
                        },
                    };
                });
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
