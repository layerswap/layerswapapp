import type { LayerswapNetwork } from '@layerswap/widget-types';
import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createMemoizedConnectionStore } from "@layerswap/wallet-core"
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
export function createFuelConnection<Network extends LayerswapNetwork = LayerswapNetwork>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateFuelConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options

    let networks = initialProps.networks
    const fuelConnectionService = new FuelConnectionService<Network>()
    fuelConnectionService.setNetworks(networks)
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
            fuelConnectionService.setNetworks(networks)
        },
        onDestroy: unregisterWalletSynchronizer,
    })
}
