import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DepositActionStep } from '../lib/apiClients/layerSwapApiClient';

export type SwapExecutionKind = 'wallet-transfer' | 'frontend-swap' | 'atomic-batch' | 'gasless-deposit';

export type SwapTransaction = {
    kind: SwapExecutionKind | 'transaction';
    hash?: string;
    timestamp?: number;
};

export type SwapStepTransaction = { hash: string; timestamp: number; explorerUrl: string };
export type SwapStepTransactions = Partial<Record<DepositActionStep, SwapStepTransaction>>;

type SwapTransactionStore = {
    // Execution identity and submission receipts. Swap status always comes from the API.
    swapTransactions: Record<string, SwapTransaction>;
    // Prerequisite receipts never prove a submitted swap.
    stepTransactions: Record<string, SwapStepTransactions>;
    setStepTransaction: (id: string, step: DepositActionStep, hash: string, explorerUrl: string) => void;
    // Provider withdrawals whose outcome is unknown must be reconciled before retrying.
    pendingSubmissions: Record<string, true>;
    markSubmissionPending: (id: string) => void;
    clearPendingSubmission: (id: string) => void;
    setSwapTransactionKind: (id: string, kind: SwapExecutionKind) => void;
    setSwapTransaction: (id: string, hash: string, kind?: SwapExecutionKind) => void;
    removeSwapTransaction: (id: string) => void;
};

type SwapDepositHintClickedStore = {
    swapTransactions: Record<string, boolean>;
    setSwapDepositHintClicked: (Id: string) => void;
};

export type GaslessAuthorization = {
    // Absent on older clients, which also stored self-paid prerequisites here.
    kind?: 'gasless';
    // Signed authorization deadline (unix seconds), never a locally inferred outcome.
    validBefore: number;
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
    removeGaslessAuthorization: (Id: string) => void;
};

type PersistedTransactionReceipts = Pick<SwapTransactionStore, 'swapTransactions' | 'stepTransactions' | 'pendingSubmissions'>;
type PersistedGaslessAuthorizations = Pick<GaslessAuthorizationStore, 'authorizations'>;

function savedRecords(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function transactionReceipt(value: unknown): { hash: string; timestamp: number } | undefined {
    const saved = savedRecords(value);
    if (typeof saved.hash !== 'string' || !saved.hash.trim()) return undefined;
    return { hash: saved.hash, timestamp: savedTimestamp(saved.timestamp) };
}

function savedTimestamp(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function transactionReceipts(value: unknown): PersistedTransactionReceipts {
    const saved = savedRecords(value);
    const swapTransactions: Record<string, SwapTransaction> = {};
    for (const [id, value] of Object.entries(savedRecords(saved.swapTransactions))) {
        const entry = savedRecords(value);
        const receipt = transactionReceipt(value);
        const kind = entry.kind === 'wallet-transfer' || entry.kind === 'frontend-swap'
            || entry.kind === 'atomic-batch' || entry.kind === 'gasless-deposit' ? entry.kind : undefined;
        if (receipt) {
            swapTransactions[id] = { kind: kind ?? 'transaction', ...receipt };
        } else if (kind) {
            swapTransactions[id] = { kind };
        }
    }
    const stepTransactions: Record<string, SwapStepTransactions> = {};
    for (const [id, steps] of Object.entries(savedRecords(saved.stepTransactions))) {
        const receipts: SwapStepTransactions = {};
        for (const [step, value] of Object.entries(savedRecords(steps)) as [DepositActionStep, unknown][]) {
            const receipt = transactionReceipt(value);
            const explorerUrl = savedRecords(value).explorerUrl;
            if (receipt && typeof explorerUrl === 'string') receipts[step] = { ...receipt, explorerUrl };
        }
        if (Object.keys(receipts).length) stepTransactions[id] = receipts;
    }
    const pendingSubmissions: Record<string, true> = {};
    for (const [id, pending] of Object.entries(savedRecords(saved.pendingSubmissions))) {
        if (pending === true) pendingSubmissions[id] = true;
    }
    return { swapTransactions, stepTransactions, pendingSubmissions };
}

function gaslessAuthorizationReceipts(persisted: unknown): PersistedGaslessAuthorizations {
    const authorizations: Record<string, GaslessAuthorization> = {};
    for (const [id, value] of Object.entries(savedRecords(savedRecords(persisted).authorizations))) {
        const saved = savedRecords(value);
        if (typeof saved.validBefore !== 'number' || !Number.isFinite(saved.validBefore)) continue;
        authorizations[id] = {
            ...(saved.kind === 'gasless' ? { kind: 'gasless' as const } : {}),
            validBefore: saved.validBefore,
        };
    }
    return { authorizations };
}

export const useSwapTransactionStore = create<SwapTransactionStore>()(
    persist<SwapTransactionStore, [], [], PersistedTransactionReceipts>(
        set => ({
            swapTransactions: {},
            stepTransactions: {},
            pendingSubmissions: {},
            setStepTransaction: (id, step, hash, explorerUrl) => {
                if (!hash.trim()) return;
                set(state => ({
                    stepTransactions: {
                        ...state.stepTransactions,
                        [id]: {
                            ...state.stepTransactions[id],
                            [step]: {
                                hash,
                                explorerUrl,
                                timestamp: state.stepTransactions[id]?.[step]?.hash === hash
                                    ? state.stepTransactions[id][step]!.timestamp : Date.now(),
                            },
                        },
                    },
                }));
            },
            markSubmissionPending: id => set(state => ({
                pendingSubmissions: { ...state.pendingSubmissions, [id]: true },
            })),
            clearPendingSubmission: id => set(state => {
                const { [id]: removed, ...pendingSubmissions } = state.pendingSubmissions;
                return { pendingSubmissions };
            }),
            setSwapTransactionKind: (id, kind) => set(state => {
                const current = state.swapTransactions[id];
                if (current?.kind === kind) return state;
                return { swapTransactions: { ...state.swapTransactions, [id]: { ...current, kind } } };
            }),
            setSwapTransaction: (id, hash, kind) => {
                if (!hash.trim()) return;
                set(state => {
                    const current = state.swapTransactions[id];
                    const { [id]: removed, ...pendingSubmissions } = state.pendingSubmissions;
                    return {
                        swapTransactions: {
                            ...state.swapTransactions,
                            [id]: {
                                kind: kind ?? current?.kind ?? 'transaction',
                                hash,
                                timestamp: current?.hash === hash ? current.timestamp : Date.now(),
                            },
                        },
                        pendingSubmissions,
                    };
                });
            },
            removeSwapTransaction: id => set(state => {
                const { [id]: removed, ...swapTransactions } = state.swapTransactions;
                return { swapTransactions };
            }),
        }),
        {
            name: 'swapTransactions',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: transactionReceipts,
            migrate: transactionReceipts,
            merge: (persisted, current) => ({ ...current, ...transactionReceipts(persisted) }),
        },
    ),
);

export const useGaslessAuthorizationStore = create<GaslessAuthorizationStore>()(
    persist<GaslessAuthorizationStore, [], [], PersistedGaslessAuthorizations>(
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
            partialize: gaslessAuthorizationReceipts,
            merge: (persisted, current) => ({ ...current, ...gaslessAuthorizationReceipts(persisted) }),
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
