import type { Wallet } from '@layerswap/widget-types'
import { getConnections, type Config, type Connector } from '@wagmi/core'
import { getDynamicWcMetadata } from '@layerswap/wallet-core'
import { EIP155_NAMESPACE, HIDDEN_WALLETCONNECT_ID } from '../constants'

export function resolveWalletConnector(config: Config, wallet: Wallet): Connector {
    const connections = getConnections(config).filter(connection =>
        connection.accounts.some(address => address.toLowerCase() === wallet.address.toLowerCase()),
    )
    const uid = wallet.metadata?.evmConnectorUid
    const matches = connections.filter(({ connector }) => {
        if (uid) return connector.uid === uid
        if (connector.id === wallet.internalId || connector.name === wallet.id) return true
        if (connector.id !== HIDDEN_WALLETCONNECT_ID) return false
        const metadata = getDynamicWcMetadata(EIP155_NAMESPACE, wallet.address)
        return !!metadata && (metadata.id === wallet.internalId || metadata.name === wallet.id)
    })
    if (matches.length !== 1) {
        // Name what was looked for and what the config holds, so a report can tell a
        // dropped connection from a stale selection without the wallet state at hand.
        const selected = [wallet.providerName, wallet.id, uid ? `connector ${uid}` : wallet.internalId].filter(Boolean).join(' / ')
        const connected = getConnections(config).map(({ connector }) => `${connector.id}#${connector.uid}`).join(', ') || 'none'
        throw new Error(`Selected wallet is no longer connected. Reconnect your wallet. (selected: ${selected}; matches: ${matches.length}; connected for this address: ${connections.length}; connected: ${connected})`)
    }
    return matches[0]!.connector
}
