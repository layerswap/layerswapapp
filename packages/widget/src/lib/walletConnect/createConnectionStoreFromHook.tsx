'use client'
import { useEffect, type FC } from 'react'
import { createStore } from 'zustand/vanilla'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@/types/wallet'

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
        useEffect(() => {
            if (store.getState() === value) return
            store.setState(value, true)
        })
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
