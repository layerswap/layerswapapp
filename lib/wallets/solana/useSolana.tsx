import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { Network } from "../../../Models/Network"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useWalletModalState } from "../../../stores/walletModalStateStore"
import { useMemo } from "react"

export default function useSolana({ network }: { network: Network | undefined }): WalletProvider {

    const commonSupportedNetworks = [
        KnownInternalNames.Networks.SolanaMainnet,
        KnownInternalNames.Networks.SolanaDevnet,
        KnownInternalNames.Networks.EclipseTestnet,
        KnownInternalNames.Networks.EclipseMainnet
    ]

    const name = 'Solana'
    const id = 'solana'
    const { publicKey, disconnect, wallet: solanaWallet, select, wallets } = useWallet();

    const setWalletModalIsOpen = useWalletModalState((state) => state.setOpen)
    const setSelectedProvider = useWalletModalState((state) => state.setSelectedProvider)

    const wallet: Wallet | undefined = publicKey ? {
        address: publicKey.toBase58(),
        connector: solanaWallet?.adapter?.name,
        providerName: name,
        icon: resolveWalletConnectorIcon({ connector: String(solanaWallet?.adapter.name), address: publicKey?.toBase58() }),
        disconnect,
        connect: () => connectWallet(),
        isActive: true,
        addresses: [publicKey.toBase58()]
    } : undefined

    const getWallet = () => {

        if (wallet) {
            if (network?.name.toLowerCase().startsWith('eclipse') && !(solanaWallet?.adapter?.name.toLowerCase() === "backpack" || solanaWallet?.adapter?.name.toLowerCase() === "nightly")) {
                return undefined
            }

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
        const solanaConnector = wallets.find(w => w.adapter.name === connector.name)
        if (!solanaConnector) throw new Error('Connector not found')
        select(solanaConnector.adapter.name)
        await solanaConnector.adapter.connect()

        const connectedWallet = wallets.find(w => w.adapter.connected === true)
        const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
        const wallet: Wallet[] | undefined = connectedAddress ? [{
            address: connectedAddress,
            connector: connectedWallet?.adapter.name,
            providerName: name,
            icon: resolveWalletConnectorIcon({ connector: String(connectedWallet?.adapter.name), address: connectedAddress }),
            disconnect,
            connect: () => connectWallet(),
            isActive: true,
            addresses: [connectedAddress]
        }] : undefined

        return wallet
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect = useMemo(() => {
        const connectors: InternalConnector[] = [];
        const solNetwork = network?.name?.toLowerCase().includes('eclipse') ? 'eclipse' : 'solana'

        for (const wallet of wallets) {

            const internalConnector: InternalConnector = {
                name: wallet.adapter.name,
                id: wallet.adapter.name,
                icon: wallet.adapter.icon,
                type: wallet.readyState === 'Installed' ? 'injected' : 'other'
            }

            if (solNetwork === 'eclipse') {
                if (!(wallet.adapter.name.toLowerCase() === "backpack" || wallet.adapter.name.toLowerCase() === "nightly")) {
                    continue
                } else {
                    connectors.push(internalConnector)
                }
            } else {
                connectors.push(internalConnector)
            }
        }

        return connectors;
    }, [wallets]);

    const provider = {
        activeAccountAddress: wallet?.address,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        connectWallet,
        connectConnector,
        disconnectWallets: disconnectWallet,
        availableWalletsForConnect,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
    }

    return provider
}