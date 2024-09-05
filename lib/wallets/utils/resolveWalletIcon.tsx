import AddressIcon from "../../../components/AddressIcon";
import WalletIcon from "../../../components/icons/WalletIcon";
import KnownEVMConnectors from "../evm/KnownEVMConnectors";
import KnownSolanaConnectors from "../solana/KnownSolanaConnectors";
import KnownStarknetConnectors from "../starknet/KnownStarknetConnectors";

const connectors = [
    ...KnownEVMConnectors,
    ...KnownSolanaConnectors,
    ...KnownStarknetConnectors
]

const resolveWalletConnectorIcon = ({ connector, address }: { connector?: string, address?: string }) => {
    const knownConnector = connectors.find(c => c.id.toLowerCase() === connector?.toLowerCase())

    if (knownConnector) return knownConnector.icon
    else if (!knownConnector && address) return AddressIconWrapper(address)
    else return (props) => <WalletIcon {...props} />
}

const AddressIconWrapper = (address: string) => (props: typeof AddressIcon) => {
    return <AddressIcon address={address} size={24} {...props} />
}
export default resolveWalletConnectorIcon