import { create } from 'zustand'
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

type Batches = Record<string, AtomicBatchRecord>
type State = {
    batches: Batches
    begin: (record: AtomicBatchRecord) => Promise<void>
    update: (swapId: string, attempt: string, update: Partial<AtomicBatchRecord>) => Promise<void>
}

const STORAGE_KEY = 'atomicBatches'
const STORAGE_LOCK = 'layerswap-atomic-batch-storage'

export const supportsWebLocks = (): boolean =>
    typeof navigator !== 'undefined' && !!navigator.locks

function readBatchStorage(): { value: string | null; batches: Batches } {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === null) return { value, batches: {} }
    const batches = JSON.parse(value)?.state?.batches
    if (!batches || typeof batches !== 'object' || Array.isArray(batches)) throw new Error('Invalid batch recovery records')
    return { value, batches }
}

function mergeBatches(saved: Batches, current: Batches): Batches {
    const batches = Object.fromEntries(Object.entries(saved).map(([swapId, record]) => {
        const existing = current[swapId]
        if (existing?.attempt === record.attempt) {
            // Preserve IDs and terminal evidence retained in memory after a failed write.
            const preserveLocalState = existing.state === 'reconciled'
                || (existing.state === 'confirmed' && record.state !== 'reconciled')
                || (!isBatchOutstanding(existing) && isBatchOutstanding(record))
            record = { ...record, ...(existing.id && { id: existing.id }),
                ...(existing.transactionHash && { transactionHash: existing.transactionHash }),
                ...(existing.catchupComplete && { catchupComplete: true }),
                ...(preserveLocalState && { state: existing.state }) }
            if (JSON.stringify(record) === JSON.stringify(existing)) record = existing
        }
        return [swapId, record]
    }))
    return Object.keys(batches).length === Object.keys(current).length
        && Object.entries(batches).every(([id, record]) => current[id] === record) ? current : batches
}

function publishBatches(batches: Batches): void {
    if (batches !== useAtomicBatchStore.getState().batches) useAtomicBatchStore.setState({ batches })
}

function writeBatchStorage(batches: Batches): string {
    // Keep the persisted shape used by existing clients and recovery records.
    const value = JSON.stringify({ state: { batches }, version: 0 })
    localStorage.setItem(STORAGE_KEY, value)
    return value
}

function updateBatch(batches: Batches, swapId: string, attempt: string, update: Partial<AtomicBatchRecord>): Batches {
    const current = batches[swapId]
    if (!current || current.attempt !== attempt) return batches
    // A delayed response must retain IDs without reversing terminal proof.
    const next = !isBatchOutstanding(current) ? { ...update, state: current.state } : update
    if (Object.entries(next).every(([key, value]) => Object.is(current[key as keyof AtomicBatchRecord], value))) return batches
    return { ...batches, [swapId]: { ...current, ...next } }
}

// The durable submitting record owns the wallet request across tabs. Only hold
// the mutex for state reads/writes, so backend reconciliation can finish while
// a wallet prompt is still open.
async function withBatchStorage(operation: (saved: ReturnType<typeof readBatchStorage>, batches: Batches) => Batches): Promise<void> {
    if (!supportsWebLocks()) throw new Error('This browser cannot safely coordinate atomic swap submissions.')
    await navigator.locks.request(STORAGE_LOCK, () => {
        const saved = readBatchStorage()
        const batches = mergeBatches(saved.batches, useAtomicBatchStore.getState().batches)
        let next: Batches
        try {
            // The operation must finish its durable write before publishing new state.
            next = operation(saved, batches)
        } catch (error) {
            // Still expose recovery records read from other tabs, without the failed change.
            publishBatches(batches)
            throw error
        }
        publishBatches(next)
    })
}

export const useAtomicBatchStore = create<State>(() => ({
    batches: (() => {
        try { return readBatchStorage().batches } catch { return {} }
    })(),
    begin: record => withBatchStorage((saved, batches) => {
        if (Object.values(batches).some(isBatchOutstanding)) throw new Error('An earlier batch must be reconciled before another submission.')
        const previous = batches[record.swapId]
        if (previous?.state === 'confirmed' || previous?.state === 'reconciled') throw new Error('This atomic swap was already submitted.')
        const next = { ...batches, [record.swapId]: record }
        try {
            const value = writeBatchStorage(next)
            if (localStorage.getItem(STORAGE_KEY) !== value) throw new Error('Could not persist batch recovery record')
        } catch (error) {
            // No wallet request has started. Undo a write whose verification failed.
            try {
                if (saved.value === null) localStorage.removeItem(STORAGE_KEY)
                else localStorage.setItem(STORAGE_KEY, saved.value)
            } catch { /* A durable submitting record remains conservative if rollback also fails. */ }
            throw error
        }
        return next
    }),
    update: (swapId, attempt, update) => withBatchStorage((saved, batches) => {
        const next = updateBatch(batches, swapId, attempt, update)
        // Comparing against storage also flushes evidence retained after failed writes.
        if (JSON.stringify(next) !== JSON.stringify(saved.batches)) writeBatchStorage(next)
        return next
    }).catch(error => {
        // An accepted ID/receipt must survive in this tab even if storage is unavailable.
        publishBatches(updateBatch(useAtomicBatchStore.getState().batches, swapId, attempt, update))
        throw error
    }),
}))

/** Reload recovery state under the same mutex, without writing it back. */
export function reloadAtomicBatchStorage(): Promise<void> {
    return withBatchStorage((_saved, batches) => batches)
}

let storageSubscribers = 0
const refreshFromStorage = () => { void reloadAtomicBatchStorage().catch(() => {}) }
const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) refreshFromStorage()
}

/** Keep mounted widgets aware of recovery state created or completed in another tab. */
export function subscribeAtomicBatchStorage(): () => void {
    if (storageSubscribers++ === 0) window.addEventListener('storage', onStorage)
    refreshFromStorage()
    return () => { if (--storageSubscribers === 0) window.removeEventListener('storage', onStorage) }
}

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
