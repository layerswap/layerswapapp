import { create } from 'zustand'
import type { Network, Wallet } from '@layerswap/widget-types'

/** Wallet request identifiers for recovery. Swap and receipt status are always fetched. */
export type AtomicBatchRecord = {
    swapId: string
    attempt: string
    account: string
    network: Network
    wallet: Wallet
    createdAt: number
    id?: string
}

type Batches = Record<string, AtomicBatchRecord>
type State = {
    batches: Batches
    begin: (record: AtomicBatchRecord) => Promise<void>
    update: (swapId: string, attempt: string, update: Pick<AtomicBatchRecord, 'id'>) => Promise<void>
    remove: (swapId: string, attempt: string) => Promise<void>
}

const STORAGE_KEY = 'atomicBatches'
const STORAGE_LOCK = 'layerswap-atomic-batch-storage'

export const supportsWebLocks = (): boolean =>
    typeof navigator !== 'undefined' && !!navigator.locks

function readBatchStorage(): Batches {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === null) return {}
    const saved = JSON.parse(value)?.state?.batches
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid batch recovery records')
    return Object.fromEntries(Object.entries(saved).map(([swapId, value]) => {
        const record = value as AtomicBatchRecord
        if (record.swapId !== swapId || !record.attempt || !record.account || !record.network || !record.wallet) {
            throw new Error('Invalid batch recovery record')
        }
        // Drop all legacy lifecycle fields. A saved outcome is never authoritative.
        return [swapId, { swapId, attempt: record.attempt, account: record.account,
            network: record.network, wallet: record.wallet, createdAt: record.createdAt,
            ...(record.id && { id: record.id }) }]
    }))
}

function publish(batches: Batches): void {
    const current = useAtomicBatchStore.getState().batches
    if (JSON.stringify(current) !== JSON.stringify(batches)) useAtomicBatchStore.setState({ batches })
}

async function withStorage(change: (batches: Batches) => Batches, retainOnFailure = false, verify = false): Promise<void> {
    if (!supportsWebLocks()) throw new Error('This browser cannot safely coordinate atomic swap submissions.')
    await navigator.locks.request(STORAGE_LOCK, () => {
        const saved = readBatchStorage()
        // Preserve an accepted ID after a failed write, but never resurrect a removed attempt.
        const batches = Object.fromEntries(Object.entries(saved).map(([id, record]) => {
            const current = useAtomicBatchStore.getState().batches[id]
            return [id, current?.attempt === record.attempt && current.id ? { ...record, id: current.id } : record]
        }))
        const next = change(batches)
        if (JSON.stringify(next) !== JSON.stringify(saved)) {
            const previous = localStorage.getItem(STORAGE_KEY)
            try {
                const value = JSON.stringify({ state: { batches: next }, version: 1 })
                localStorage.setItem(STORAGE_KEY, value)
                if (verify && localStorage.getItem(STORAGE_KEY) !== value) throw new Error('Could not persist batch request')
            } catch (error) {
                if (verify) {
                    try {
                        if (previous === null) localStorage.removeItem(STORAGE_KEY)
                        else localStorage.setItem(STORAGE_KEY, previous)
                    } catch { /* Retain the request if storage cannot verify its removal. */ }
                }
                publish(retainOnFailure ? next : batches)
                throw error
            }
        }
        publish(next)
    })
}

export const useAtomicBatchStore = create<State>(() => ({
    batches: (() => {
        try { return readBatchStorage() } catch { return {} }
    })(),
    begin: record => withStorage(batches => {
        if (batches[record.swapId]) throw new Error('Check the original wallet request before submitting this swap again.')
        return { ...batches, [record.swapId]: record }
    }, false, true),
    update: (swapId, attempt, update) => withStorage(batches => {
        const current = batches[swapId]
        if (!current || current.attempt !== attempt || !update.id) return batches
        return { ...batches, [swapId]: { ...current, id: update.id } }
    }, true).catch(error => {
        const batches = useAtomicBatchStore.getState().batches
        const current = batches[swapId]
        if (current?.attempt === attempt && update.id) publish({ ...batches, [swapId]: { ...current, id: update.id } })
        throw error
    }),
    remove: (swapId, attempt) => withStorage(batches => {
        if (batches[swapId]?.attempt !== attempt) return batches
        const { [swapId]: removed, ...remaining } = batches
        return remaining
    }),
}))

export const getAtomicBatch = (swapId: string | undefined): AtomicBatchRecord | undefined =>
    swapId ? useAtomicBatchStore.getState().batches[swapId] : undefined

export function reloadAtomicBatchStorage(): Promise<void> {
    return withStorage(batches => batches)
}

let storageSubscribers = 0
const refreshFromStorage = () => { void reloadAtomicBatchStorage().catch(() => {}) }
const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) refreshFromStorage()
}

export function subscribeAtomicBatchStorage(): () => void {
    if (storageSubscribers++ === 0) window.addEventListener('storage', onStorage)
    refreshFromStorage()
    return () => { if (--storageSubscribers === 0) window.removeEventListener('storage', onStorage) }
}

let executionOwner: symbol | undefined
/** In-memory guard against overlapping wallet prompts, independent of recovery history. */
export function acquireWalletExecution(): (() => void) | undefined {
    if (executionOwner) return undefined
    const owner = Symbol('wallet-execution')
    executionOwner = owner
    return () => { if (executionOwner === owner) executionOwner = undefined }
}
