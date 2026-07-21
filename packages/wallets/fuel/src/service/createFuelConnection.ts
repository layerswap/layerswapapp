import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createStore } from 'zustand/vanilla'
import { createFuelTransfer } from '../transferProvider/createFuelTransfer'
import { fuelConnectionService } from './FuelConnectionService'
import { useFuelStore } from './fuelStore'

type CreateFuelConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Fuel wallet connection. Replaces the
 * old `useFuelConnection` hook.
 */
export function createFuelConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateFuelConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    fuelConnectionService.setNetworks(networks)

    const transferProvider = createFuelTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        connectors: unknown
        fuel: unknown
        ready: unknown
        connectedWallets: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const fuelState = useFuelStore.getState()
        const inputs: SnapshotInputs = {
            connectors: fuelState.connectors,
            fuel: fuelState.fuel,
            ready: fuelState.ready,
            connectedWallets: fuelState.connectedWallets,
            networks,
        }
        if (lastInputs
            && lastInputs.connectors === inputs.connectors
            && lastInputs.fuel === inputs.fuel
            && lastInputs.ready === inputs.ready
            && lastInputs.connectedWallets === inputs.connectedWallets
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
            ...fuelConnectionService.buildProvider(),
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
        useFuelStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            fuelConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
