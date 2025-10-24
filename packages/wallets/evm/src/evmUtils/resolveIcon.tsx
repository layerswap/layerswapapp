import { resolveWalletConnectorHelper } from "@layerswap/widget/internal"
import KnownEVMConnectors from "./KnownEVMConnectors"

export const resolveEVMWalletConnectorIndex = (id: string) => {
    return KnownEVMConnectors.findIndex(c => (c as any).id === id?.toLowerCase())
}

export const resolveEVMWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address?: string, iconUrl?: string }) => {
    const knownConnector = KnownEVMConnectors.find(c => c.id.toLowerCase() === connector?.toLowerCase())

    if (knownConnector && knownConnector.icon)
        return knownConnector.icon
    else
        return resolveWalletConnectorHelper(address, iconUrl)
}