import {
    type Config,
    getAccount,
    getConnectors,
    watchAccount,
    watchConnectors,
} from '@bigmi/client'
import type { InternalConnector } from '@layerswap/widget/types'
import { snapshotFromBitcoinAccount, useBitcoinStore } from './bitcoinStore'
import { connectorsConfigs } from './connectorsConfigs'

let _dispose: (() => void) | null = null
let _config: Config | null = null

const resolveConnectors = async (connectors: readonly Awaited<ReturnType<typeof getConnectors>>[number][]): Promise<InternalConnector[]> => {
    return Promise.all(connectors.map(async (connector) => {
        const provider = await connector.getProvider().catch(() => undefined)
        const isInjected = !!provider
        const installLink = !isInjected ? connectorsConfigs.find(c => c.id === connector.id)?.installLink : undefined
        return {
            name: connector.name,
            id: connector.id,
            icon: connector.icon,
            type: isInjected ? 'injected' : 'other',
            installUrl: installLink,
            extensionNotFound: !isInjected,
            providerName: connector.name,
        }
    }))
}

export function attachBitcoinSync(config: Config): () => void {
    if (_config === config && _dispose) return _dispose
    _dispose?.()
    _config = config

    const store = useBitcoinStore.getState()
    const initialConnectors = getConnectors(config)
    store._setAccount(snapshotFromBitcoinAccount(getAccount(config)))
    store._setAllConnectors(initialConnectors)

    let disposed = false

    resolveConnectors(initialConnectors).then((resolved) => {
        if (!disposed) useBitcoinStore.getState()._setResolvedConnectors(resolved)
    })

    const unwatchAccount = watchAccount(config, {
        onChange: (account) => {
            useBitcoinStore.getState()._setAccount(snapshotFromBitcoinAccount(account))
        },
    })
    const unwatchConnectors = watchConnectors(config, {
        onChange: (connectors) => {
            useBitcoinStore.getState()._setAllConnectors(connectors)
            resolveConnectors(connectors).then((resolved) => {
                if (!disposed) useBitcoinStore.getState()._setResolvedConnectors(resolved)
            })
        },
    })

    _dispose = () => {
        if (disposed) return
        disposed = true
        unwatchAccount()
        unwatchConnectors()
        _dispose = null
        _config = null
    }
    return _dispose
}

export function isBitcoinSyncAttached(): boolean {
    return _dispose !== null
}
