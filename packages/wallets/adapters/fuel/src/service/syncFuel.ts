import { Fuel, FuelConnectorEventTypes, type FuelConnector } from '@fuel-ts/account'
import { useFuelStore } from './fuelStore'

let _attached = false
let _dispose: (() => void) | null = null
let _fuel: Fuel | null = null
const walletSynchronizers = new Set<() => Promise<void>>()

export function registerFuelWalletSynchronizer(sync: () => Promise<void>): () => void {
    walletSynchronizers.add(sync)
    return () => {
        walletSynchronizers.delete(sync)
    }
}

async function syncConnectedWallets(): Promise<void> {
    await Promise.allSettled([...walletSynchronizers].map(sync => sync()))
}

export function attachFuelSync(fuel: Fuel): () => void {
    if (_fuel === fuel && _dispose) return _dispose
    _dispose?.()
    let disposed = false

    useFuelStore.getState()._setFuel(fuel)

    const refreshConnectors = async () => {
        try {
            const connectors = await fuel.connectors()
            if (disposed) return
            useFuelStore.getState()._setConnectors(connectors)
            attachConnectorListeners(connectors)
        } catch {
            // swallow
        }
    }

    const onConnection = () => {
        void refreshAll()
    }
    const onCurrentConnector = () => {
        syncConnectedWallets().catch(() => { /* swallow */ })
    }

    let perConnectorDisposers: Array<() => void> = []
    function attachConnectorListeners(connectors: readonly FuelConnector[]) {
        // Detach previous listeners
        perConnectorDisposers.forEach(fn => fn())
        perConnectorDisposers = []

        for (const c of connectors) {
            const handler = () => { void refreshAll() }
            // Listen to every connector, including ones the SDK has not selected.
            // Connection events need refreshed status flags before reconciliation.
            for (const event of [
                FuelConnectorEventTypes.accounts,
                FuelConnectorEventTypes.currentAccount,
                FuelConnectorEventTypes.connection,
                FuelConnectorEventTypes.currentNetwork,
            ] as const) {
                c.on(event, handler)
                perConnectorDisposers.push(() => c.off(event, handler))
            }
        }
    }

    // Refresh connector detection flags, then sync sessions the refreshed
    // flags reveal. Shared by initial population, bounded re-detection and
    // the window-focus refresh below.
    const refreshAll = () => refreshConnectors()
        .then(() => { if (!disposed) return syncConnectedWallets() })
        .catch(() => { /* swallow */ })
    const onConnectors = () => { void refreshAll() }

    let retryTimers: ReturnType<typeof setTimeout>[] = []
    const onWindowFocus = () => { void refreshAll() }

    const dispose = () => {
        if (disposed) return
        disposed = true
        fuel.off(FuelConnectorEventTypes.connectors, onConnectors)
        fuel.off(FuelConnectorEventTypes.connection, onConnection)
        fuel.off(FuelConnectorEventTypes.currentConnector, onCurrentConnector)
        perConnectorDisposers.forEach(fn => fn())
        perConnectorDisposers = []
        retryTimers.forEach(t => clearTimeout(t))
        retryTimers = []
        if (typeof window !== 'undefined') window.removeEventListener('focus', onWindowFocus)
        if (_dispose !== dispose) return
        _attached = false
        _dispose = null
        _fuel = null
    }
    try {
        fuel.on(FuelConnectorEventTypes.connectors, onConnectors)
        fuel.on(FuelConnectorEventTypes.connection, onConnection)
        fuel.on(FuelConnectorEventTypes.currentConnector, onCurrentConnector)
    } catch (error) {
        dispose()
        throw error
    }

    _attached = true
    _fuel = fuel
    _dispose = dispose

    // Initial population. The SDK restores the stored connector during Fuel's
    // constructor with `emitEvents: false`, which skips the `connection` event,
    // and its early `currentConnector` emit races the store population above —
    // so no event reliably announces a restored session. `fuel.connectors()`
    // refreshes each connector's `connected` flag, so a sync chained after it
    // picks the restored session up deterministically.
    void refreshAll()

    // Detection is not one-shot-reliable: extension content scripts and MV3
    // service workers can come up after the initial ping, and a wallet that
    // announced itself before our listeners attached is silent forever after.
    // The pre-refactor @fuels/react layer re-polled connectors; mirror that
    // with a bounded re-detection pass (spaced beyond the SDK's 5s ping cache)
    // plus a refresh on window focus — which also picks up an extension the
    // user just installed from the "Install" prompt, or unlocked via popup.
    if (typeof window !== 'undefined') {
        const RETRY_DELAYS_MS = [6_000, 14_000]
        retryTimers = RETRY_DELAYS_MS.map(delay => setTimeout(() => {
            const connectors = useFuelStore.getState().connectors
            if (connectors.length === 0 || connectors.some(c => !c.installed)) void refreshAll()
        }, delay))
        window.addEventListener('focus', onWindowFocus)
    }

    return _dispose
}

export function isFuelSyncAttached(): boolean {
    return _attached
}
