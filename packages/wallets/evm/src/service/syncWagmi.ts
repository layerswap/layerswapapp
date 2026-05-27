import {
    type Config,
    getAccount,
    getConnections,
    getConnectors,
    watchAccount,
    watchConnections,
    watchConnectors,
} from '@wagmi/core'
import { snapshotFromAccount, useEvmStore } from './evmStore'

let _attached = false
let _dispose: (() => void) | null = null
let _config: Config | null = null

export function attachWagmiSync(config: Config): () => void {
    if (_config === config && _dispose) return _dispose
    _dispose?.()

    const store = useEvmStore
    const unwatchers: Array<() => void> = []
    try {
        store.getState()._setWagmiAccount(snapshotFromAccount(getAccount(config)))
        store.getState()._setConnections(getConnections(config))
        store.getState()._setConnectors(getConnectors(config))

        unwatchers.push(watchAccount(config, {
            onChange: (account) => {
                useEvmStore.getState()._setWagmiAccount(snapshotFromAccount(account))
            },
        }))
        unwatchers.push(watchConnections(config, {
            onChange: (connections) => {
                useEvmStore.getState()._setConnections(connections)
            },
        }))
        unwatchers.push(watchConnectors(config, {
            onChange: (connectors) => {
                useEvmStore.getState()._setConnectors(connectors)
            },
        }))
    } catch (error) {
        unwatchers.forEach(unwatch => unwatch())
        throw error
    }

    let disposed = false
    const dispose = () => {
        if (disposed) return
        disposed = true
        unwatchers.forEach(unwatch => unwatch())
        if (_dispose !== dispose) return
        _attached = false
        _dispose = null
        _config = null
    }
    _attached = true
    _config = config
    _dispose = dispose
    return _dispose
}

export function isWagmiSyncAttached(): boolean {
    return _attached
}
