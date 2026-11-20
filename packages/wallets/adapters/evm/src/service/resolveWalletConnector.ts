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
    if (matches.length !== 1) throw new Error('Selected wallet is no longer connected. Reconnect your wallet.')
    return matches[0]!.connector
}
