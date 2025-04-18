import MetaMaskIcon from "../../../components/AllIcons/Wallets/MetaMask"
import WalletConnectIcon from "../../../components/AllIcons/Wallets/WalletConnect"
import BitKeep from "../../../components/AllIcons/Wallets/BitKeep"
import RainbowIcon from "../../../components/AllIcons/Wallets/Rainbow"
import CoinbaseIcon from "../../../components/AllIcons/Wallets/Coinbase"
import Phantom from "../../../components/AllIcons/Wallets/Phantom"
import { Connector } from "wagmi"
import Argent from "../../../components/AllIcons/Wallets/Argent"
import ImtblPassportIcon from "../../../components/AllIcons/Wallets/ImtblPassport"
import BitGetIcon from "../../../components/AllIcons/Wallets/Bitget"
import BrowserWallet from "../../../components/AllIcons/Wallets/BrowserWallet"

const KnownEVMConnectors = [
    {
        id: 'metamask',
        icon: MetaMaskIcon,
    },
    {
        id: 'io.metamask',
        icon: MetaMaskIcon
    },
    {
        id: 'metamasksdk',
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
        id: 'app.rainbow',
        icon: RainbowIcon
    },
    {
        id: 'bitkeep',
        icon: BitKeep
    },
    {
        id: 'bitget',
        icon: BitGetIcon
    },
    {
        id: 'coinbasewalletsdk',
        icon: CoinbaseIcon
    },
    {
        id: 'phantom',
        icon: Phantom
    },
    {
        id: 'app.phantom',
        icon: Phantom
    },
    {
        id: 'argent',
        icon: Argent
    },
    {
        id: 'com.immutable.passport',
        icon: ImtblPassportIcon
    },
    {
        id: 'injected',
        icon: BrowserWallet
    }
]

export const evmConnectorNameResolver = (connector: Connector) => {

    const connectorById = KnownEVMConnectors.find(c => c.id === connector.id.toLowerCase())
    const connectorByName = KnownEVMConnectors.find(c => c.id === connector.name.toLowerCase())

    if (connectorById) return connectorById.id
    else if (connectorByName) return connectorByName.id

    return connector.id
}

export default KnownEVMConnectors