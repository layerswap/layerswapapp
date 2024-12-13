import AddressIcon from "../../../components/AddressIcon";
import SVGWithImg from "../../../components/icons/SvgWithImg";
import KnownEVMConnectors from "../evm/KnownEVMConnectors";
import KnownFuelConnectors from "../fuel/KnownFuelConnectors";
import KnownSolanaConnectors from "../solana/KnownSolanaConnectors";
import KnownStarknetConnectors from "../starknet/KnownStarknetConnectors";

const connectors = [
    ...KnownEVMConnectors,
    ...KnownSolanaConnectors,
    ...KnownStarknetConnectors,
    ...KnownFuelConnectors
]

const resolveWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address: string, iconUrl?: string }) => {
    const knownConnector = connectors.find(c => c.id === connector?.toLowerCase())

    if (iconUrl) return SVGIconWrapper(iconUrl)
    else if (!knownConnector) return AddressIconWrapper(address)

    return knownConnector.icon
}

const AddressIconWrapper = (address: string) => (props) => {
    return <AddressIcon {...props} address={address} size={24} />
}

const SVGIconWrapper = (iconUrl: string) => (props) => {
    return <SVGWithImg {...props} imageurl={iconUrl} />
}

export default resolveWalletConnectorIcon