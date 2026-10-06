import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Network, Wallet } from '@layerswap/widget-types'

export type AtomicBatchRecord = {
    swapId: string
    attempt: string
    account: string
    network: Network
    wallet: Wallet
    validBefore: number
    createdAt: number
    state: 'submitting' | 'pending' | 'uncertain' | 'confirmed' | 'failed' | 'not_submitted' | 'rejected' | 'reconciled'
    id?: string
    transactionHash?: string
    catchupComplete?: boolean
}

export const isBatchOutstanding = (batch: AtomicBatchRecord | undefined): boolean =>
    !!batch && (batch.state === 'submitting' || batch.state === 'pending' || batch.state === 'uncertain')

type State = {
    batches: Record<string, AtomicBatchRecord>
    begin: (record: AtomicBatchRecord) => void
    update: (swapId: string, attempt: string, update: Partial<AtomicBatchRecord>) => void
}

export const useAtomicBatchStore = create(persist<State>(set => ({
    batches: {},
    begin: record => {
        if (getOutstandingBatch()) throw new Error('An earlier batch must be reconciled before another submission.')
        const previous = useAtomicBatchStore.getState().batches[record.swapId]
        if (previous?.state === 'confirmed' || previous?.state === 'reconciled') throw new Error('This atomic swap was already submitted.')
        // Refuse to open the wallet when durable storage is unavailable. Zustand keeps
        // the in-memory lock even if writing the record throws (e.g. quota exhausted).
        if (typeof localStorage === 'undefined') throw new Error('Batch recovery storage is unavailable')
        set(state => ({ batches: { ...state.batches, [record.swapId]: record } }))
        const saved = JSON.parse(localStorage.getItem('atomicBatches') ?? '{}')
        if (saved.state?.batches?.[record.swapId]?.attempt !== record.attempt) throw new Error('Could not persist batch recovery record')
    },
    update: (swapId, attempt, update) => set(state => {
        const current = state.batches[swapId]
        if (!current || current.attempt !== attempt) return state
        // A delayed wallet response must retain IDs without reversing backend/receipt proof.
        const next = current.state === 'confirmed' || current.state === 'reconciled'
            ? { ...update, state: current.state } : update
        return { batches: { ...state.batches, [swapId]: { ...current, ...next } } }
    }),
}), { name: 'atomicBatches', storage: createJSONStorage(() => localStorage) }))

export function getOutstandingBatch(): AtomicBatchRecord | undefined {
    return Object.values(useAtomicBatchStore.getState().batches).find(isBatchOutstanding)
}

let executionOwner: symbol | undefined
/** Shared across withdrawal component instances, including the swap creation stage. */
export function acquireWalletExecution(): (() => void) | undefined {
    if (executionOwner || getOutstandingBatch()) return undefined
    const owner = Symbol('wallet-execution')
    executionOwner = owner
    return () => { if (executionOwner === owner) executionOwner = undefined }
}
