import AddressIcon from "../../../components/AddressIcon";
import SVGWithImg from "../../../components/icons/SvgWithImg";
import WalletIcon from "../../../components/icons/WalletIcon";
import KnownEVMConnectors from "../evm/KnownEVMConnectors";
import KnownSolanaConnectors from "../solana/KnownSolanaConnectors";
import KnownStarknetConnectors from "../starknet/KnownStarknetConnectors";

const connectors = [
    ...KnownEVMConnectors,
    ...KnownSolanaConnectors,
    ...KnownStarknetConnectors
]

const resolveWalletConnectorIcon = ({ connector, address, iconUrl }: { connector?: string, address?: string, iconUrl?: string }) => {
    const knownConnector = connectors.find(c => c.id === connector?.toLowerCase())

    if (iconUrl) return SVGIconWrapper(iconUrl)
    else if (!knownConnector) {
        if (address) return AddressIconWrapper(address)
        else return WalletIcon
    }

    return knownConnector.icon
}

const AddressIconWrapper = (address: string) => (props: typeof AddressIcon) => {
    return <AddressIcon address={address} size={24} {...props} />
}

const SVGIconWrapper = (iconUrl: string) => (props) => {
    return <SVGWithImg {...props} imageUrl={iconUrl} />
}

export default resolveWalletConnectorIcon