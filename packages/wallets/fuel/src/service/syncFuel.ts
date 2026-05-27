import { Fuel, FuelConnectorEventTypes } from '@fuel-ts/account'
import { fuelConnectionService } from './FuelConnectionService'
import { useFuelStore } from './fuelStore'

let _attached = false
let _dispose: (() => void) | null = null
let _fuel: Fuel | null = null

export function attachFuelSync(fuel: Fuel): () => void {
    if (_fuel === fuel && _dispose) return _dispose
    _dispose?.()

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

    let disposed = false
    const dispose = () => {
        if (disposed) return
        disposed = true
        fuel.off(FuelConnectorEventTypes.connectors, refreshConnectors)
        fuel.off(FuelConnectorEventTypes.connection, onConnection)
        fuel.off(FuelConnectorEventTypes.currentConnector, onCurrentConnector)
        perConnectorDisposers.forEach(fn => fn())
        perConnectorDisposers = []
        if (_dispose !== dispose) return
        _attached = false
        _dispose = null
        _fuel = null
    }
    try {
        fuel.on(FuelConnectorEventTypes.connectors, refreshConnectors)
        fuel.on(FuelConnectorEventTypes.connection, onConnection)
        fuel.on(FuelConnectorEventTypes.currentConnector, onCurrentConnector)
    } catch (error) {
        dispose()
        throw error
    }

    _attached = true
    _fuel = fuel
    _dispose = dispose

    // Initial population
    refreshConnectors().catch(() => { /* swallow */ })

    return _dispose
}

export function isFuelSyncAttached(): boolean {
    return _attached
}
