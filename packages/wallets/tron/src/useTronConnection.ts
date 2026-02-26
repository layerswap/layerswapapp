import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { KnownInternalNames, walletIconResolver } from "@layerswap/widget/internal";
import { WalletConnectionProviderProps, InternalConnector, Wallet, WalletConnectionProvider } from "@layerswap/widget/types";
import { useMemo } from "react";
import { useTronTransfer } from './transferProvider/useTronTransfer';
import { name, id, tronNames } from "./constants"

export default function useTronConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {

    const network = networks.find(n => n.name === KnownInternalNames.Networks.TronMainnet || n.name === KnownInternalNames.Networks.TronTestnet)

    const { wallets, wallet: tronWallet, disconnect, select, signTransaction } = useWallet();

    const address = tronWallet?.adapter.address

    const wallet: Wallet | undefined = address ? {
        id: tronWallet.adapter.name,
        addresses: [address],
        address,
        displayName: `${tronWallet.adapter.name} - Tron`,
        networkIcon: network?.logo,
        providerName: name,
        isActive: true,
        icon: walletIconResolver(address, tronWallet.adapter.icon),
        disconnect: () => disconnectWallet(),
        autofillSupportedNetworks: tronNames,
        withdrawalSupportedNetworks: tronNames,
        asSourceSupportedNetworks: tronNames,
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
                icon: walletIconResolver(connectedAddress, connectedWallet?.adapter.icon),
                disconnect,
                isActive: true,
                addresses: [connectedAddress],
                autofillSupportedNetworks: tronNames,
                withdrawalSupportedNetworks: tronNames,
                asSourceSupportedNetworks: tronNames,
            } : undefined
            return wallet
        }
        catch (e) {
            throw new Error(e.message || e);
        }
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            //TODO: handle error
            console.log(e)
        }
    }

    const { executeTransfer: transfer } = useTronTransfer()

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

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets: disconnectWallet,

        transfer,

        availableWalletsForConnect,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        autofillSupportedNetworks: tronNames,
        withdrawalSupportedNetworks: tronNames,
        asSourceSupportedNetworks: tronNames,
        name,
        id,
        providerIcon: network?.logo,
        ready: wallets.length > 0
    }

    return provider
}