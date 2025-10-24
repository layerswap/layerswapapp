import AddressIcon from "@/components/Common/AddressIcon";
import SVGWithImg from "@/components/Icons/SvgWithImg";
import WalletIcon from "@/components/Icons/WalletIcon";
import { InternalConnector } from "@/types";
// import KnownEVMConnectors from "../evm/evmUtils/KnownEVMConnectors";
// import KnownFuelConnectors from "../fuel/utils/KnownFuelConnectors";
// import KnownSolanaConnectors from "../svm/utils/KnownSolanaConnectors";

const connectors = [
    // ...KnownEVMConnectors,
    // ...KnownSolanaConnectors,
    // ...KnownStarknetConnectors,
    // ...KnownFuelConnectors
]

export const resolveWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: InternalConnector, address?: string, iconUrl?: string }) => {
    // console.log("gago", connector?.name, connector?.icon)
    if (connector && connector.icon) return SVGIconWrapper(connector.icon)
    else
        return resolveWalletConnectorHelper(address, iconUrl)
}

export const resolveWalletConnectorIndex = (id: string) => {
    return connectors.findIndex(c => (c as any).id === id?.toLowerCase())
}

export const resolveWalletConnectorHelper = (address: string | undefined, iconUrl: string | undefined) => {
    if (iconUrl) return SVGIconWrapper(iconUrl)

    if (address) return AddressIconWrapper(address)
    else return WalletIcon
}

const AddressIconWrapper = (address: string) => (props: typeof AddressIcon) => {
    return <AddressIcon address={address} size={24} {...props} />
}

const SVGIconWrapper = (iconUrl: string) => (props) => {
    return <SVGWithImg {...props} image_url={iconUrl} />
}
