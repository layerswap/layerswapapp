import { Connector } from "wagmi"
import { MetaMaskIcon, WalletConnectIcon, BitKeepIcon, RainbowIcon, CoinbaseIcon, PhantomIcon, ArgentIcon, ImtblPassportIcon, BitGetIcon, BrowserWalletIcon } from "@layerswap/widget/internal"

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
        icon: BitKeepIcon
    },
    {
        id: 'bitget',
        icon: BitGetIcon
    },
    {
        id: 'coinbaseWalletSDK',
        icon: CoinbaseIcon
    },
    {
        id: 'phantom',
        icon: PhantomIcon
    },
    {
        id: 'app.phantom',
        icon: PhantomIcon
    },
    {
        id: 'ready (formerly argent)',
        icon: ArgentIcon
    },
    {
        id: 'com.immutable.passport',
        icon: ImtblPassportIcon
    },
    {
        id: 'injected',
        icon: BrowserWalletIcon
    }
]

export const evmConnectorNameResolver = (connector: Connector) => {

    const connectorById = KnownEVMConnectors.find(c => c.id.toLowerCase() === connector.id.toLowerCase())
    const connectorByName = KnownEVMConnectors.find(c => c.id.toLowerCase() === connector.name.toLowerCase())

    if (connectorById) return connectorById.id
    else if (connectorByName) return connectorByName.id

    return connector.id
}

export default KnownEVMConnectors