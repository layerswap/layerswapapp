'use client'
import { useLayoutEffect, type FC } from 'react'
import { createStore } from 'zustand/vanilla'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@/types/wallet'

/**
 * Shallow one-level equality over the provider's own keys. The wrapped legacy
 * hooks usually return a freshly-constructed object each render, so reference
 * equality is always false; comparing fields avoids broadcasting a store update
 * (and re-rendering every `useSyncExternalStore` subscriber) when nothing
 * meaningful actually changed.
 */
function shallowEqualProvider(a: WalletConnectionProvider, b: WalletConnectionProvider): boolean {
    if (a === b) return true
    const aKeys = Object.keys(a) as (keyof WalletConnectionProvider)[]
    const bKeys = Object.keys(b) as (keyof WalletConnectionProvider)[]
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(key => a[key] === b[key])
}

const EMPTY_PROVIDER: WalletConnectionProvider = Object.freeze({
    connectWallet: () => undefined,
    connectedWallets: undefined,
    activeWallet: undefined,
    withdrawalSupportedNetworks: [],
    name: '',
    id: '',
    ready: false,
})

export type ReactHookConnectionAdapter = {
    /**
     * Render this inside the package's `wrapper` component. It calls the
     * underlying hook and mirrors its value into the external store.
     */
    Hydrator: FC<WalletConnectionProviderProps>
    /** Pass this as `WalletProvider.createConnection`. */
    createConnection: (props: WalletConnectionProviderProps) => WalletConnectionStore
}

/**
 * Bridges a legacy React-hook-shaped connection provider to the new
 * external-store contract. Used by wallet packages whose upstream
 * libraries require React (TonConnectUI, StarknetReact, etc.).
 *
 * Usage per package:
 *   const adapter = createReactHookConnectionAdapter(useXxxConnection)
 *   // inside wrapper: <adapter.Hydrator networks={networksFromSettings} />
 *   // in factory:    createConnection: adapter.createConnection
 */
export function createReactHookConnectionAdapter(
    useConnection: (props: WalletConnectionProviderProps) => WalletConnectionProvider,
): ReactHookConnectionAdapter {
    const store = createStore<WalletConnectionProvider>(() => EMPTY_PROVIDER)

    const Hydrator: FC<WalletConnectionProviderProps> = (props) => {
        const value = useConnection(props)
        // Layout effect so the store commits in the same frame as the render
        // that produced `value` — a passive effect would let a subscriber paint
        // against the previous snapshot (one-frame-stale wallet UI / tearing).
        // The `[value]` dep + shallow compare prevent a write (and the
        // subscriber re-render storm) on every parent render.
        useLayoutEffect(() => {
            if (shallowEqualProvider(store.getState(), value)) return
            store.setState(value, true)
        }, [value])
        return null
    }

    const createConnection = (_props: WalletConnectionProviderProps): WalletConnectionStore => ({
        store,
        updateProps() {
            // Networks propagate via the Hydrator's props. No-op here.
        },
        destroy() {
            // Per-package adapters are singletons; we don't tear them down
            // because a remount would reuse the same instance.
        },
    })

    return { Hydrator, createConnection }
}
