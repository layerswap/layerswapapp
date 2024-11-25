import { ConnectedWallet, useTonConnectUI, useTonWallet, WalletInfo } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useEffect, useState } from "react";
import { useConnectModal } from "../../../components/WalletModal";

export default function useTON(): WalletProvider {
    
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TONMainnet,
        KnownInternalNames.Networks.TONTestnet
    ]

    const name = 'TON'
    const id = 'ton'

    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const [tonWallets, setTonWallets] = useState<WalletInfo[] | undefined>([])

    useEffect(() => {
        const getWallets = async () => {
            const wallets = await tonConnectUI.getWallets()
            setTonWallets(wallets)
        }
        getWallets()
    }, [])

    const address = tonWallet?.account && Address.parse(tonWallet.account.address).toString({ bounceable: false })
    const iconUrl = tonWallet?.["imageUrl"]

    const wallet = tonWallet && address ? {
        addresses: [address],
        address,
        iconUrl,
        connector: name,
        providerName: id,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl }),
        disconnect: () => disconnectWallets(),
        connect: () => connectWallet(),
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const { connect } = useConnectModal()

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector }) => {
        const tonWallet = tonWallets?.find(w => w.name === connector.name)

        if (!tonWallet) throw new Error('Connector not found')

        function connectAndWaitForStatusChange(wallet) {
            return new Promise((resolve, reject) => {
                try {
                    // Initiate the connection
                    tonConnectUI.connector.connect(wallet);

                    // Listen for the status change
                    tonConnectUI.onStatusChange((status) => {
                        if (status) resolve(status); // Resolve the promise with the status
                    });
                } catch (error) {
                    console.error('Error connecting:', error);
                    reject(error); // Reject the promise if an exception is thrown
                }
            });
        }

        const result: Wallet[] | undefined = await connectAndWaitForStatusChange(tonWallet)
            .then((status: ConnectedWallet) => {
                const connectedAddress = Address.parse(status.account.address).toString({ bounceable: false })
                const connectedName = status.device.appName
                const wallet = status && connectedAddress ? {
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    connector: connectedName,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: connectedName, address: connectedAddress }),
                    disconnect: () => disconnectWallets(),
                    connect: () => connectWallet(),
                } : undefined

                return wallet ? [wallet] : undefined
            })
            .catch((error) => {
                console.error('Promise rejected with error:', error);
                return undefined
            });

        return result

    }

    const disconnectWallets = async () => {
        try {
            await tonConnectUI.disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect: InternalConnector[] | undefined = tonWallets?.map(w => ({
        id: w.appName,
        name: w.name,
        icon: w.imageUrl,
    }))

    const provider = {
        connectWallet,
        disconnectWallets,
        connectConnector,
        availableWalletsForConnect,
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