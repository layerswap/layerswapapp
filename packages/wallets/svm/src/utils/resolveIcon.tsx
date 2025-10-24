import { resolveWalletConnectorHelper } from "@layerswap/widget/internal"
import KnownSolanaConnectors from "./KnownSolanaConnectors"

export const resolveSolanaWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address?: string, iconUrl?: string }) => {
    const knownConnector = KnownSolanaConnectors.find(c => c.id.toLowerCase() === connector?.toLowerCase())

    if (knownConnector && knownConnector.icon)
        return knownConnector.icon
    else
        return resolveWalletConnectorHelper(address, iconUrl)
}