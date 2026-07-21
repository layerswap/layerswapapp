import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createStore } from 'zustand/vanilla'
import { createTronTransfer } from '../transferProvider/createTronTransfer'
import { tronConnectionService } from './TronConnectionService'
import { useTronStore } from './tronStore'

type CreateTronConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Tron wallet connection. Replaces the
 * old `useTronConnection` hook. The widget consumes this via `useSyncExternalStore`.
 */
export function createTronConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateTronConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    tronConnectionService.setNetworks(networks)

    const transferProvider = createTronTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        wallets: unknown
        activeWalletName: unknown
        activeAddress: unknown
        ready: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const state = useTronStore.getState()
        const inputs: SnapshotInputs = {
            wallets: state.wallets,
            activeWalletName: state.activeWalletName,
            activeAddress: state.activeAddress,
            ready: state.ready,
            networks,
        }
        if (lastInputs
            && lastInputs.wallets === inputs.wallets
            && lastInputs.activeWalletName === inputs.activeWalletName
            && lastInputs.activeAddress === inputs.activeAddress
            && lastInputs.ready === inputs.ready
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
            ...tronConnectionService.buildProvider(),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }

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

    const unsubs: (() => void)[] = [
        useTronStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            tronConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
