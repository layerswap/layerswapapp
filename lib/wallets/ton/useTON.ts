import { ConnectedWallet, useTonConnectUI, useTonWallet } from "@tonconnect/ui-react"
import { Address } from "@ton/core";
import KnownInternalNames from "../../knownIds";
import { Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "../../../context/settings";

export default function useTON(): WalletProvider {
    const { networks } = useSettingsState()

    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TONMainnet,
        KnownInternalNames.Networks.TONTestnet
    ]

    const name = 'TON'
    const id = 'ton'

    const tonWallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();

    const address = tonWallet?.account && Address.parse(tonWallet.account.address).toString({ bounceable: false })
    const iconUrl = tonWallet?.["imageUrl"] as string
    const wallet_id = tonWallet?.["name"] || tonWallet?.device.appName
    const wallet: Wallet | undefined = tonWallet && address ? {
        id: wallet_id,
        displayName: `${wallet_id} - Ton`,
        addresses: [address],
        address,
        providerName: id,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl }),
        disconnect: () => disconnectWallets(),
        connect: () => connectWallet(),
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }


    const connectWallet = async () => {

        if (tonWallet) {
            await disconnectWallets()
        }

        function connectAndWaitForStatusChange() {
            return new Promise((resolve, reject) => {
                try {
                    // Initiate the connection
                    tonConnectUI.openModal();

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

        const result: Wallet | undefined = await connectAndWaitForStatusChange()
            .then((status: ConnectedWallet) => {
                const connectedAddress = Address.parse(status.account.address).toString({ bounceable: false })
                const connectedName = status.device.appName
                const wallet: Wallet | undefined = status && connectedAddress ? {
                    id: connectedName,
                    displayName: `${connectedName} - Ton`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: connectedName, address: connectedAddress }),
                    disconnect: () => disconnectWallets(),
                    connect: () => connectWallet(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                } : undefined

                return wallet ? wallet : undefined
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

    // const availableWalletsForConnect: InternalConnector[] | undefined = tonWallets?.map(w => ({
    //     id: w.appName,
    //     name: w.name,
    //     icon: w.imageUrl,
    // }))

    const provider = {
        connectWallet,
        disconnectWallets,
        // availableWalletsForConnect,
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