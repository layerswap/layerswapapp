import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/ui-kit/types"
import { createMemoizedConnectionStore } from "@layerswap/ui-kit"
import { createFuelTransfer } from '../transferProvider/createFuelTransfer'
import { FuelConnectionService } from './FuelConnectionService'
import { registerFuelWalletSynchronizer } from './syncFuel'
import { useFuelStore } from './fuelStore'

type CreateFuelConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Fuel wallet connection. Replaces the
 * old `useFuelConnection` hook.
 */
export function createFuelConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateFuelConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const fuelConnectionService = new FuelConnectionService<Network>()
    fuelConnectionService.setNetworks(networks, networkAdapter)
    const unregisterWalletSynchronizer = registerFuelWalletSynchronizer(
        () => fuelConnectionService.syncConnectedWallets()
    )

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
            networkAdapter = nextProps.networkAdapter
            fuelConnectionService.setNetworks(networks, networkAdapter)
        },
        onDestroy: unregisterWalletSynchronizer,
    })
}
