import type {
    MultiStepHandler,
    NetworkWithTokens,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@layerswap/widget/types'
import { createMemoizedConnectionStore } from '@layerswap/widget/internal'
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

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const fuelState = useFuelStore.getState()
            return {
                connectors: fuelState.connectors,
                fuel: fuelState.fuel,
                ready: fuelState.ready,
                connectedWallets: fuelState.connectedWallets,
                networks,
            }
        },
        buildSnapshot: () => ({
            ...fuelConnectionService.buildProvider(),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }),
        subscribe: sync => [
            useFuelStore.subscribe(sync),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            fuelConnectionService.setNetworks(networks)
        },
    })
}
