import { Fuel, FuelConnectorEventTypes } from '@fuel-ts/account'
import { fuelConnectionService } from './FuelConnectionService'
import { useFuelStore } from './fuelStore'

let _attached = false
let _dispose: (() => void) | null = null

export function attachFuelSync(fuel: Fuel): () => void {
    if (_attached) return _dispose ?? (() => { })
    _attached = true

    useFuelStore.getState()._setFuel(fuel)

    const refreshConnectors = async () => {
        try {
            const connectors = await fuel.connectors()
            useFuelStore.getState()._setConnectors(connectors)
            // Re-attach per-connector network listeners whenever the list changes
            attachConnectorNetworkListeners(connectors)
        } catch {
            // swallow
        }
    }

    const onConnection = () => {
        fuelConnectionService.resolveConnectedWallets().catch(() => { /* swallow */ })
    }
    const onCurrentConnector = () => {
        fuelConnectionService.resolveConnectedWallets().catch(() => { /* swallow */ })
    }

    fuel.on(FuelConnectorEventTypes.connectors, refreshConnectors)
    fuel.on(FuelConnectorEventTypes.connection, onConnection)
    fuel.on(FuelConnectorEventTypes.currentConnector, onCurrentConnector)

    // Initial population
    refreshConnectors().catch(() => { /* swallow */ })

    let perConnectorDisposers: Array<() => void> = []
    function attachConnectorNetworkListeners(connectors: readonly any[]) {
        // Detach previous listeners
        perConnectorDisposers.forEach(fn => fn())
        perConnectorDisposers = []

        for (const c of connectors) {
            const handler = async () => {
                await fuelConnectionService.resolveConnectedWallets()
            }
            c.on(FuelConnectorEventTypes.currentNetwork, handler)
            perConnectorDisposers.push(() => c.off(FuelConnectorEventTypes.currentNetwork, handler))
        }
    }

    _dispose = () => {
        fuel.off(FuelConnectorEventTypes.connectors, refreshConnectors)
        fuel.off(FuelConnectorEventTypes.connection, onConnection)
        fuel.off(FuelConnectorEventTypes.currentConnector, onCurrentConnector)
        perConnectorDisposers.forEach(fn => fn())
        perConnectorDisposers = []
        _attached = false
        _dispose = null
    }
    return _dispose
}

export function isFuelSyncAttached(): boolean {
    return _attached
}
