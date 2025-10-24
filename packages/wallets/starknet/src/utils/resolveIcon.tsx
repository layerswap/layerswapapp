import { walletIconResolver } from "@layerswap/widget/internal"
import KnownStarknetConnectors from "./KnownStarknetConnectors"

export const resolveStarknetWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address?: string, iconUrl?: string }) => {
    const knownConnector = KnownStarknetConnectors.find(c => c.id.toLowerCase() === connector?.toLowerCase())

    if (knownConnector && knownConnector.icon)
        return knownConnector.icon
    else
        return walletIconResolver(address, iconUrl)
}