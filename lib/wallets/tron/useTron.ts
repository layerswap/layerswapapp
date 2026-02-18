import KnownInternalNames from "../../knownIds";
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { InternalConnector, Wallet, WalletProvider } from "@/Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "@/context/settings";
import { useMemo } from "react";

export default function useTron(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TronMainnet,
        KnownInternalNames.Networks.TronTestnet
    ]

    const { networks } = useSettingsState()
    const network = networks.find(n => n.name === KnownInternalNames.Networks.TronMainnet || n.name === KnownInternalNames.Networks.TronTestnet)
    const name = 'Tron'
    const id = 'tron'
    const { wallets, wallet: tronWallet, disconnect, select } = useWallet();

    const address = tronWallet?.adapter.address
    const switchAccount = async (wallet: Wallet, address: string) => {
        // as we do not have multiple accounts management we will leave the method empty
    }
    const wallet: Wallet | undefined = address ? {
        id: tronWallet.adapter.name,
        addresses: [address],
        address,
        displayName: `${tronWallet.adapter.name} - Tron`,
        networkIcon: network?.logo,
        providerName: name,
        isActive: true,
        icon: resolveWalletConnectorIcon({ connector: name, address, iconUrl: tronWallet.adapter.icon }),
        disconnect: () => disconnectWallet(),
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
    } : undefined

    const getWallet = () => {
        if (wallet) {
            return [wallet]
        }
        return undefined
    }

    const connectWallet = async ({ connector }: { connector: InternalConnector }) => {
        const tronConnector = wallets.find(w => w.adapter.name === connector.name)
        if (!tronConnector) throw new Error('Connector not found')
        try {
            select(tronConnector.adapter.name)
            await tronConnector.adapter.connect()

            const connectedWallet = wallets.find(w => w.adapter.connected === true)
            const connectedAddress = connectedWallet?.adapter.address

            const wallet: Wallet | undefined = connectedAddress ? {
                address: connectedAddress,
                providerName: name,
                id: connectedWallet?.adapter.name,
                displayName: `${connectedWallet.adapter.name} - Tron`,
                networkIcon: network?.logo,
                icon: resolveWalletConnectorIcon({ connector: String(connectedWallet?.adapter.name), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
                disconnect,
                isActive: true,
                addresses: [connectedAddress],
                autofillSupportedNetworks: commonSupportedNetworks,
                withdrawalSupportedNetworks: commonSupportedNetworks,
                asSourceSupportedNetworks: commonSupportedNetworks,
            } : undefined
            return wallet
        }
        catch (e) {
            const error = e
            throw new Error(e.message || e);
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

    const availableWalletsForConnect: InternalConnector[] = useMemo(() => wallets.map(wallet => {
        const isNotInstalled = wallet.state == 'NotFound'
        return {
            id: wallet.adapter.name,
            name: wallet.adapter.name,
            icon: wallet.adapter.icon,
            type: isNotInstalled ? 'other' : 'injected',
            installUrl: wallet.adapter?.url,
            extensionNotFound: isNotInstalled,
            providerName: name
        }
    }), [wallets])

    const provider: WalletProvider = {
        connectWallet,
        disconnectWallets: disconnectWallet,
        availableWalletsForConnect,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon: network?.logo,
        switchAccount,
        ready: wallets.length > 0
    }

    return provider
}