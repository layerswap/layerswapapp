import type {
    MultiStepHandler,
    NetworkWithTokens,
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@layerswap/widget/types'
import { connectModalStore } from '@layerswap/widget/internal'
import { createStore } from 'zustand/vanilla'
import { createBitcoinTransfer } from '../transferProvider/createBitcoinTransfer'
import { bitcoinConnectionService } from './BitcoinConnectionService'
import { useBitcoinStore } from './bitcoinStore'

type CreateBitcoinConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Bitcoin wallet connection. Replaces the
 * old `useBitcoinConnection` hook.
 */
export function createBitcoinConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateBitcoinConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    bitcoinConnectionService.setNetworks(networks)
    bitcoinConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
    })

    const transferProvider = createBitcoinTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        account: unknown
        resolvedConnectors: unknown
        ready: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const state = useBitcoinStore.getState()
        const inputs: SnapshotInputs = {
            account: state.account,
            resolvedConnectors: state.resolvedConnectors,
            ready: state.ready,
            networks,
        }
        if (lastInputs
            && lastInputs.account === inputs.account
            && lastInputs.resolvedConnectors === inputs.resolvedConnectors
            && lastInputs.ready === inputs.ready
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
            ...bitcoinConnectionService.buildProvider(),
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
        useBitcoinStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            bitcoinConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
