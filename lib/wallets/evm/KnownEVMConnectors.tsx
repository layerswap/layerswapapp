import MetaMaskIcon from "../../../components/icons/Wallets/MetaMask"
import WalletConnectIcon from "../../../components/icons/Wallets/WalletConnect"
import BitKeep from "../../../components/icons/Wallets/BitKeep"
import RainbowIcon from "../../../components/icons/Wallets/Rainbow"
import CoinbaseIcon from "../../../components/icons/Wallets/Coinbase"
import Phantom from "../../../components/icons/Wallets/Phantom"
import { Connector } from "wagmi"
import Argent from "../../../components/icons/Wallets/Argent"

const KnownEVMConnectors = [
    {
        id: 'metamask',
        icon: MetaMaskIcon
    },
    {
        id: 'walletconnect',
        icon: WalletConnectIcon
    },
    {
        id: 'rainbow',
        icon: RainbowIcon
    },
    {
        id: 'bitkeep',
        icon: BitKeep
    },
    {
        id: 'coinbasewallet',
        icon: CoinbaseIcon
    },
    {
        id: 'phantom',
        icon: Phantom
    },
    {
        id: 'argent',
        icon: Argent
    },
]

export const evmConnectorNameResolver = (connector: Connector) => {

    const connectorById = KnownEVMConnectors.find(c => c.id === (connector as any)?._wallets?.[0]?.id?.toLowerCase()
        || c.id === connector.id.toLowerCase())
    const connectorByName = KnownEVMConnectors.find(c => c.id === (connector as any)?._wallets?.[0]?.name?.toLowerCase()
        || c.id === connector.name.toLowerCase())

    if (connectorById) return connectorById.id
    else if (connectorByName) return connectorByName.id

    return connector.id
}

export default KnownEVMConnectors