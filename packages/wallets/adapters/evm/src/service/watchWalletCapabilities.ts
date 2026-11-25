import { getConnections, watchConnections, type Config, type Connection } from '@wagmi/core'
import type { Network, Wallet } from '@layerswap/widget-types'
import { getWalletCapabilityService, type PublishedCapabilities } from '../transferProvider/walletCapabilities'

/** Reads each connection's capabilities when it connects, and again when the page returns to view. */
export function watchWalletCapabilities(config: Config, onChange: (capabilities: PublishedCapabilities) => void): () => void {
    const service = getWalletCapabilityService(config)

    const read = (connection: Connection, refresh: boolean) => {
        const { connector, accounts, chainId } = connection
        // The connector identity is enough to resolve this exact connection.
        const wallet = { id: connector.name, internalId: connector.id, metadata: { connectorId: connector.id, connectorUid: connector.uid } } as Wallet
        const network = { chain_id: String(chainId) } as Network
        for (const account of accounts) {
            if (!refresh && service.getPublished()[connector.uid]?.[account.toLowerCase()]) continue
            service.getCapabilities({ wallet, account, network }).catch(() => undefined)
        }
    }
    const readAll = (refresh: boolean) => getConnections(config).forEach(connection => read(connection, refresh))
    const onVisible = () => {
        if (document.visibilityState === 'visible') readAll(true)
    }

    const unsubscribe = service.subscribe(() => onChange(service.getPublished()))
    const unwatch = watchConnections(config, {
        onChange: connections => connections.forEach(connection => read(connection, false)),
    })
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
    onChange(service.getPublished())
    readAll(false)

    return () => {
        unsubscribe()
        unwatch()
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
    }
}
