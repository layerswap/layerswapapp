import type { StoreApi } from "zustand/vanilla"
import type { WalletConnectionProvider, WalletProviderStoreRegistry } from "@/types"

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

export type WalletProvidersRegistry = WalletProviderStoreRegistry & {
    getEntries(): readonly Entry[]
    getStoreById(id: string): StoreApi<WalletConnectionProvider> | undefined
    setEntries(next: readonly Entry[]): void
}

export function createWalletProvidersRegistry(): WalletProvidersRegistry {
    let entries: readonly Entry[] = []
    const listeners = new Set<Listener>()
    const innerUnsubs = new Map<string, () => void>()

    const notify = (): void => {
        for (const listener of listeners) listener()
    }

    return {
        getEntries(): readonly Entry[] {
            return entries
        },
        getStoreById(id: string): StoreApi<WalletConnectionProvider> | undefined {
            return entries.find(e => e.id === id)?.store
        },
        /** Convenience for non-React peers that need a peer provider's current snapshot. */
        getById(id: string): WalletConnectionProvider | undefined {
            return this.getStoreById(id)?.getState()
        },
        setEntries(next: readonly Entry[]): void {
            if (next === entries) return
            const nextById = new Map(next.map(e => [e.id, e.store]))
            // Tear down inner subs for ids that are gone OR whose store changed.
            for (const [id, unsub] of innerUnsubs) {
                const nextStore = nextById.get(id)
                const prevStore = entries.find(e => e.id === id)?.store
                if (!nextStore || nextStore !== prevStore) {
                    unsub()
                    innerUnsubs.delete(id)
                }
            }
            // Subscribe newly added stores.
            for (const e of next) {
                if (!innerUnsubs.has(e.id)) {
                    innerUnsubs.set(e.id, e.store.subscribe(notify))
                }
            }
            entries = next
            notify()
        },
        subscribe(listener: Listener): () => void {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
        },
    }
}
