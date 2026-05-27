import type { StoreApi } from "zustand/vanilla"
import type { WalletConnectionProvider } from "@/types"

/**
 * Vanilla, push-style registry of resolved wallet-provider stores, indexed by
 * provider id (`evm`, `starknet`, `paradex`, …). The `WalletProvidersProvider`
 * React component publishes entries on mount so non-React peers (e.g. the
 * paradex connection store, which derives state from EVM + Starknet) can read
 * peer providers without going through React.
 *
 * `subscribe` fires on both entry-set changes AND any contained store's state
 * changes — peers don't need to know whether a peer was added or its state
 * mutated, only that the world they read from moved.
 */
type Entry = { id: string; store: StoreApi<WalletConnectionProvider> }
type Listener = () => void

let _entries: readonly Entry[] = []
const _listeners = new Set<Listener>()
const _innerUnsubs = new Map<string, () => void>()

function notify(): void {
    for (const listener of _listeners) listener()
}

export const walletProvidersRegistry = {
    getEntries(): readonly Entry[] {
        return _entries
    },
    getStoreById(id: string): StoreApi<WalletConnectionProvider> | undefined {
        return _entries.find(e => e.id === id)?.store
    },
    /** Convenience for non-React peers that need a peer provider's current snapshot. */
    getById(id: string): WalletConnectionProvider | undefined {
        return this.getStoreById(id)?.getState()
    },
    setEntries(next: readonly Entry[]): void {
        if (next === _entries) return
        const nextById = new Map(next.map(e => [e.id, e.store]))
        // Tear down inner subs for ids that are gone OR whose store changed
        for (const [id, unsub] of _innerUnsubs) {
            const nextStore = nextById.get(id)
            const prevStore = _entries.find(e => e.id === id)?.store
            if (!nextStore || nextStore !== prevStore) {
                unsub()
                _innerUnsubs.delete(id)
            }
        }
        // Subscribe newly added stores
        for (const e of next) {
            if (!_innerUnsubs.has(e.id)) {
                _innerUnsubs.set(e.id, e.store.subscribe(notify))
            }
        }
        _entries = next
        notify()
    },
    subscribe(listener: Listener): () => void {
        _listeners.add(listener)
        return () => { _listeners.delete(listener) }
    },
}
