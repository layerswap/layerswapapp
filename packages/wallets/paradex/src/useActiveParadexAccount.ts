import { useSyncExternalStore } from 'react'
import { walletProvidersRegistry } from '@layerswap/widget/internal'
import type { WalletConnectionProvider } from '@layerswap/widget/types'
import { paradexConnectionService } from './service/ParadexConnectionService'
import { useParadexActiveStore, type ParadexAccount } from './service/paradexActiveStore'

type ActiveAccountSnapshot = {
    activeConnection: ParadexAccount | undefined
    setActiveAddress: (account: ParadexAccount | undefined) => void
    evmConnectionProvider: WalletConnectionProvider | undefined
    starknetConnectionProvider: WalletConnectionProvider | undefined
}

type SnapshotInputs = {
    evm: unknown
    starknet: unknown
    selected: unknown
    paradexAccounts: unknown
}
let lastInputs: SnapshotInputs | null = null
let lastSnapshot: ActiveAccountSnapshot | null = null

const subscribe = (listener: () => void): (() => void) => {
    const unsubActive = useParadexActiveStore.subscribe(listener)
    const unsubRegistry = walletProvidersRegistry.subscribe(listener)
    return () => {
        unsubActive()
        unsubRegistry()
    }
}

const getSnapshot = (): ActiveAccountSnapshot => {
    const evmConnectionProvider = walletProvidersRegistry.getById('evm')
    const starknetConnectionProvider = walletProvidersRegistry.getById('starknet')
    const selected = useParadexActiveStore.getState().selectedAccount
    const inputs: SnapshotInputs = {
        evm: evmConnectionProvider,
        starknet: starknetConnectionProvider,
        selected,
        paradexAccounts: undefined,
    }
    if (lastInputs
        && lastInputs.evm === inputs.evm
        && lastInputs.starknet === inputs.starknet
        && lastInputs.selected === inputs.selected
        && lastSnapshot) {
        return lastSnapshot
    }
    const snapshot: ActiveAccountSnapshot = {
        activeConnection: paradexConnectionService.getActiveConnection(),
        setActiveAddress: useParadexActiveStore.getState().setSelectedAccount,
        evmConnectionProvider,
        starknetConnectionProvider,
    }
    lastInputs = inputs
    lastSnapshot = snapshot
    return snapshot
}

/**
 * React-side accessor for the paradex active account. Backed by the vanilla
 * `paradexActiveStore` + `walletProvidersRegistry`, so the underlying state
 * works the same way for React and non-React callers.
 */
export function useActiveParadexAccount(): ActiveAccountSnapshot {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
