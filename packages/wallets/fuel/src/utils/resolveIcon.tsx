import { resolveWalletConnectorHelper } from "@layerswap/widget/internal"
import KnownFuelConnectors from "./KnownFuelConnectors"

export const resolveFuelWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address?: string, iconUrl?: string }) => {

    const knownConnector = KnownFuelConnectors.find(c => c.id.toLowerCase() === connector?.toLowerCase())
    if (knownConnector && knownConnector.icon)
        return knownConnector.icon
    else
        return resolveWalletConnectorHelper(address, iconUrl)
}
