import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createStore } from 'zustand/vanilla'
import { createStarknetTransfer } from '../transferProvider/createStarknetTransfer'
import { starknetConnectionService } from './StarknetConnectionService'
import { useStarknetStore } from './starknetStore'

type CreateStarknetConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Starknet wallet connection. Replaces the
 * old `useStarknetConnection` hook.
 */
export function createStarknetConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateStarknetConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    starknetConnectionService.setNetworks(networks)

    const transferProvider = createStarknetTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        connectedWallets: unknown
        activeWalletAddress: unknown
        connectors: unknown
        ready: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const state = useStarknetStore.getState()
        const inputs: SnapshotInputs = {
            connectedWallets: state.connectedWallets,
            activeWalletAddress: state.activeWalletAddress,
            connectors: state.connectors,
            ready: state.ready,
            networks,
        }
        if (lastInputs
            && lastInputs.connectedWallets === inputs.connectedWallets
            && lastInputs.activeWalletAddress === inputs.activeWalletAddress
            && lastInputs.connectors === inputs.connectors
            && lastInputs.ready === inputs.ready
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
            ...starknetConnectionService.buildProvider(),
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
        useStarknetStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            starknetConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
            // This store owns the module-level Starknet hydration lifecycle.
            starknetConnectionService.dispose()
        },
    }
}
