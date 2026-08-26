import type { Connector } from "wagmi"

/**
 * Canonical IDs for the connectors EVM packages provide string-form icon
 * overrides for. Used purely for name → id resolution; the icon strings
 * themselves are looked up via `resolveWalletIconString` in the widget.
 */
const KnownEVMConnectorIds = [
    'metamask',
    'io.metamask',
    'metamasksdk',
    'walletconnect',
    'rainbow',
    'app.rainbow',
    'bitkeep',
    'bitget',
    'coinbaseWalletSDK',
    'phantom',
    'app.phantom',
    'ready (formerly argent)',
    'com.immutable.passport',
    'injected',
]

export const evmConnectorNameResolver = (connector: Connector) => {
    const connectorById = KnownEVMConnectorIds.find(id => id.toLowerCase() === connector.id.toLowerCase())
    const connectorByName = KnownEVMConnectorIds.find(id => id.toLowerCase() === connector.name.toLowerCase())

    if (connectorById) return connectorById
    else if (connectorByName) return connectorByName

    return connector.id
}

export default KnownEVMConnectorIds
