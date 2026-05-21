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

let _attached = false
let _dispose: (() => void) | null = null

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
    if (_attached) return _dispose ?? (() => { })
    _attached = true

    const store = useBitcoinStore.getState()
    const initialConnectors = getConnectors(config)
    store._setAccount(snapshotFromBitcoinAccount(getAccount(config)))
    store._setAllConnectors(initialConnectors)

    resolveConnectors(initialConnectors).then((resolved) => {
        useBitcoinStore.getState()._setResolvedConnectors(resolved)
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
                useBitcoinStore.getState()._setResolvedConnectors(resolved)
            })
        },
    })

    _dispose = () => {
        unwatchAccount()
        unwatchConnectors()
        _attached = false
        _dispose = null
    }
    return _dispose
}

export function isBitcoinSyncAttached(): boolean {
    return _attached
}
