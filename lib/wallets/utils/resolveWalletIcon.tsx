import AddressIcon from "../../../components/AddressIcon";
import KnownEVMConnectors from "../evm/KnownEVMConnectors";
import KnownSolanaConnectors from "../solana/KnownSolanaConnectors";
import KnownStarknetConnectors from "../starknet/KnownStarknetConnectors";

const connectors = [
    ...KnownEVMConnectors,
    ...KnownSolanaConnectors,
    ...KnownStarknetConnectors
]

const resolveWalletConnectorIcon = ({ connector, address }: { connector: string, address: string }) => {
    const knownConnector = connectors.find(c => c.id === connector.toLowerCase())

    if (!knownConnector) return AddressIconWrapper(address)

    return knownConnector.icon
}

const AddressIconWrapper = (address: string) => (props) => {
    return <AddressIcon {...props} address={address} size={24} />
}
export default resolveWalletConnectorIcon