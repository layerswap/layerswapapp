import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BackendTransactionStatus, type DepositActionStep, GaslessAuthorizationStatus, GaslessAuthorizationTransaction, TransactionStatus } from '../lib/apiClients/layerSwapApiClient';

export type SwapTransaction = {
    hash: string;
    status: BackendTransactionStatus | TransactionStatus;
    failReason?: string;
    timestamp: number;
};

export type SwapStepTransaction = Pick<SwapTransaction, 'hash' | 'timestamp'> & {
    explorerUrl: string;
};

export type SwapStepTransactions = Partial<Record<DepositActionStep, SwapStepTransaction>>;

type SwapTransactionStore = {
    // Keep wallet hashes for recovery; historical status fields do not determine lifecycle outcomes.
    swapTransactions: Record<string, SwapTransaction>;
    // Prerequisite receipts are display history, never evidence of a submitted swap.
    stepTransactions: Record<string, SwapStepTransactions>;
    setStepTransaction: (id: string, step: DepositActionStep, hash: string, explorerUrl: string) => void;
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
    // Historical signature deadline; retained for recovery, never used to infer failure.
    validBefore: number;
    status?: GaslessAuthorizationStatus;
    // New recovery records retain only the hash; older records may include receipt fields.
    transaction?: Pick<GaslessAuthorizationTransaction, 'transaction_hash'> & Partial<GaslessAuthorizationTransaction> | null;
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
    recordGaslessTransactionHash: (id: string, hash: string) => void;
    setGaslessAuthorization: (Id: string, validBefore: number) => void;
    setGaslessAuthorizationStatus: (Id: string, status: GaslessAuthorizationStatus, transaction?: GaslessAuthorizationTransaction | null) => void;
    removeGaslessAuthorization: (Id: string) => void;
};


export const useSwapTransactionStore = create(
    persist<SwapTransactionStore>(
        (set) => ({
            swapTransactions: {},
            stepTransactions: {},
            pendingSubmissions: {},
            setStepTransaction: (id, step, hash, explorerUrl) => {
                if (!hash) return;
                set(state => ({
                    stepTransactions: {
                        ...state.stepTransactions,
                        [id]: {
                            ...state.stepTransactions[id],
                            [step]: { hash, explorerUrl, timestamp: Date.now() },
                        },
                    },
                }));
            },
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
                    // A provider may finish without a source-chain hash. Preserve
                    // uncertainty without inventing a transaction or its outcome.
                    if (!txHash) return { pendingSubmissions: { ...state.pendingSubmissions, [Id]: true } };
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
            merge: (persisted, current) => {
                const saved = persisted as Partial<SwapTransactionStore> | undefined;
                if (!saved) return current;
                const swapTransactions = { ...saved?.swapTransactions };
                const pendingSubmissions = { ...saved?.pendingSubmissions };
                for (const [id, transaction] of Object.entries(swapTransactions)) {
                    if (!transaction?.hash) {
                        delete swapTransactions[id];
                        pendingSubmissions[id] = true;
                    }
                }
                return { ...current, ...saved, swapTransactions, pendingSubmissions };
            },
        }
    ),
)

// Retain hash evidence across refreshes and reloads using the older recovery format.
// Current authorization statuses and confirmations stay in the API cache.
export const useGaslessAuthorizationStore = create(
    persist<GaslessAuthorizationStore>(
        (set) => ({
            authorizations: {},
            recordGaslessTransactionHash: (id, hash) => {
                if (!hash) return;
                set(state => {
                    const current = state.authorizations[id];
                    if (current?.transaction?.transaction_hash === hash) return state;
                    return {
                        authorizations: {
                            ...state.authorizations,
                            [id]: { kind: 'gasless', validBefore: current?.validBefore ?? 0, transaction: { transaction_hash: hash } },
                        },
                    };
                });
            },
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
