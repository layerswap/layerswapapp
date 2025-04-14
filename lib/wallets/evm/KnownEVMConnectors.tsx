import MetaMaskIcon from "../../../components/Icons/Wallets/MetaMask"
import WalletConnectIcon from "../../../components/Icons/Wallets/WalletConnect"
import BitKeep from "../../../components/Icons/Wallets/BitKeep"
import RainbowIcon from "../../../components/Icons/Wallets/Rainbow"
import CoinbaseIcon from "../../../components/Icons/Wallets/Coinbase"
import Phantom from "../../../components/Icons/Wallets/Phantom"
import { Connector } from "wagmi"
import Argent from "../../../components/Icons/Wallets/Argent"
import ImtblPassportIcon from "../../../components/Icons/Wallets/ImtblPassport"
import BitGetIcon from "../../../components/Icons/Wallets/Bitget"
import BrowserWallet from "../../../components/Icons/Wallets/BrowserWallet"

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
    }, {
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