import { createStore } from 'zustand/vanilla'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@/types/wallet'

export type MemoizedConnectionStoreConfig<Inputs extends Record<string, unknown>> = {
    /**
     * Read every upstream store the snapshot depends on and return the raw
     * values as a flat record. Values are compared by identity (`===`) against
     * the previous read — return stable references for unchanged state.
     */
    computeInputs: () => Inputs
    /**
     * Build the provider snapshot. Called only when at least one input changed
     * identity, so per-recompute side effects (e.g. re-configuring a connection
     * service) are safe here.
     */
    buildSnapshot: (inputs: Inputs) => WalletConnectionProvider
    /**
     * Wire upstream subscriptions. Call `sync` whenever a dependency may have
     * changed; return the unsubscribe functions.
     */
    subscribe?: (sync: () => void) => Array<() => void>
    /** Apply new host props (e.g. refreshed networks) before the store resyncs. */
    onUpdateProps?: (nextProps: WalletConnectionProviderProps) => void
    /** Extra teardown to run after subscriptions are removed. */
    onDestroy?: () => void
}

function sameInputs<Inputs extends Record<string, unknown>>(a: Inputs, b: Inputs): boolean {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(key => a[key] === b[key])
}

/**
 * Vanilla external-store factory shared by every chain package's
 * `create*Connection` implementation. Owns the "compute inputs, compare by
 * identity, rebuild the snapshot only when something changed, notify the store
 * only on a new snapshot" cycle so chain packages declare just their inputs,
 * snapshot builder, and subscriptions.
 */
export function createMemoizedConnectionStore<Inputs extends Record<string, unknown>>(
    config: MemoizedConnectionStoreConfig<Inputs>,
): WalletConnectionStore {
    let lastInputs: Inputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const inputs = config.computeInputs()
        if (lastInputs && lastSnapshot && sameInputs(lastInputs, inputs)) {
            return lastSnapshot
        }
        const snapshot = config.buildSnapshot(inputs)
        lastInputs = inputs
        lastSnapshot = snapshot
        return snapshot
    }

    const store = createStore<WalletConnectionProvider>(() => computeSnapshot())

    const sync = () => {
        const next = computeSnapshot()
        if (store.getState() === next) return
        store.setState(next, true)
    }

    const unsubs = config.subscribe?.(sync) ?? []

    return {
        store,
        updateProps(nextProps) {
            config.onUpdateProps?.(nextProps)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
            config.onDestroy?.()
        },
    }
}
