import KnownInternalNames from "../../knownIds";
import TON from "../../../components/icons/Wallets/TON";
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { InternalConnector, WalletProvider } from "../../../Models/WalletProvider";
import { useWalletModalState } from "../../../stores/walletModalStateStore";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";

export default function useTron(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TronMainnet,
        KnownInternalNames.Networks.TronTestnet
    ]

    const name = 'Tron'
    const id = 'tron'
    const { wallets, wallet: tronWallet, disconnect } = useWallet();

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

    const address = tronWallet?.adapter.address

    const wallet = address ? {
        addresses: [address],
        address,
        connector: name,
        providerName: id,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl: tronWallet.adapter.icon }),
        disconnect: () => disconnectWallet(),
        connect: () => connectWallet(),
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const connectWallet = async () => {
        try {
            setSelectedProvider(provider)
            setWalletModalIsOpen(true)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
        const tronConnector = wallets.find(w => w.adapter.name === connector.name)
        if (!tronConnector) throw new Error('Connector not found')
        try {
            await tronConnector.adapter.connect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] = wallets.map(wallet => {
        return {
            id: wallet.adapter.name,
            name: wallet.adapter.name,
            icon: wallet.adapter.icon,
            type: wallet.state !== 'NotFound' ? 'injected' : 'other'
        }
    })

    const provider = {
        connectWallet,
        disconnectWallets: disconnectWallet,
        connectConnector,
        availableWalletsForConnect,
        activeAccountAddress: wallet?.address,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
    }

    return provider
}