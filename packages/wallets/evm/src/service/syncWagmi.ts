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

export function attachWagmiSync(config: Config): () => void {
    if (_attached) return _dispose ?? (() => { })
    _attached = true

    const store = useEvmStore
    store.getState()._setWagmiAccount(snapshotFromAccount(getAccount(config)))
    store.getState()._setConnections(getConnections(config))
    store.getState()._setConnectors(getConnectors(config))

    const unwatchAccount = watchAccount(config, {
        onChange: (account) => {
            useEvmStore.getState()._setWagmiAccount(snapshotFromAccount(account))
        },
    })
    const unwatchConnections = watchConnections(config, {
        onChange: (connections) => {
            useEvmStore.getState()._setConnections(connections)
        },
    })
    const unwatchConnectors = watchConnectors(config, {
        onChange: (connectors) => {
            useEvmStore.getState()._setConnectors(connectors)
        },
    })

    _dispose = () => {
        unwatchAccount()
        unwatchConnections()
        unwatchConnectors()
        _attached = false
        _dispose = null
    }
    return _dispose
}

export function isWagmiSyncAttached(): boolean {
    return _attached
}
