import { useWallet } from "@solana/wallet-adapter-react"
import { isMobile } from "@layerswap/widget/internal"
import { InternalConnector, Wallet, WalletConnectionProvider, NetworkType, WalletConnectionProviderProps, WalletModalConnector } from "@layerswap/widget/types"
import { useMemo, useCallback } from "react"
import { resolveSolanaWalletConnectorIcon } from "./utils"
import { useSVMTransfer } from "./transferProvider/useSVMTransfer"
import { isSolanaAdapterSupported } from "./utils"
import { name, id, solanaNames } from "./constants"

export default function useSVMConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const isMobilePlatform = useMemo(() => isMobile(), []);

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ]

    const { disconnect, select, wallets, wallet: solanaWallet, signTransaction } = useWallet();
    const connectedWallet = solanaWallet?.adapter.connected === true ? solanaWallet : undefined
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name
    const connectedWallets = useMemo(() => {

        if (solanaWallet?.adapter.connected === true) {
            const wallet: Wallet | undefined = (connectedAddress && connectedAdapterName) ? {
                id: connectedAdapterName,
                address: connectedAddress,
                displayName: `${connectedWallet?.adapter.name} - Solana`,
                providerName: name,
                icon: resolveSolanaWalletConnectorIcon({ connector: String(connectedAdapterName), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
                disconnect,
                isActive: true,
                addresses: [connectedAddress],
                asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
                autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
                withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
                networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
            } : undefined

            if (wallet) {
                return [wallet]
            }
        }

    }, [connectedAddress, connectedAdapterName])
    const connectWallet = async ({ connector }: { connector: WalletModalConnector }) => {
        const internalConnector = wallets.find(w => w.adapter.name.includes(connector.name))
        const walletConnectConnector = wallets.find(w => w.adapter.name === 'WalletConnect')

        const solanaConnector = connector.hasBrowserExtension && (connector.showQrCode || isMobilePlatform) ? walletConnectConnector : internalConnector

        if (!solanaConnector) throw new Error('Connector not found')
        if (connectedWallet) await solanaConnector.adapter.disconnect()
        select(solanaConnector.adapter.name)
        await solanaConnector.adapter.connect()

        const newConnectedWallet = wallets.find(w => w.adapter.connected === true)
        const connectedAddress = newConnectedWallet?.adapter.publicKey?.toBase58()
        const wallet: Wallet | undefined = connectedAddress && newConnectedWallet ? {
            id: newConnectedWallet.adapter.name,
            address: connectedAddress,
            displayName: `${newConnectedWallet?.adapter.name} - Solana`,
            providerName: name,
            icon: resolveSolanaWalletConnectorIcon({ connector: String(newConnectedWallet?.adapter.name), address: connectedAddress, iconUrl: newConnectedWallet?.adapter.icon }),
            disconnect,
            isActive: true,
            addresses: [connectedAddress],
            asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
        } : undefined

        return wallet
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

    const { executeTransfer: transfer } = useSVMTransfer()

    const availableWalletsForConnect = useMemo(() => {
        const connectors: InternalConnector[] = [];
        for (const wallet of wallets) {
            const hasBrowserExtension = isSolanaAdapterSupported(wallet.adapter.name);
            const internalConnector: InternalConnector = {
                name: wallet.adapter.name.trim(),
                id: wallet.adapter.name.trim(),
                icon: wallet.adapter.icon,
                type: wallet.readyState === 'Installed' ? 'injected' : 'other',
                installUrl: wallet.adapter?.url,
                hasBrowserExtension: hasBrowserExtension,
                extensionNotFound: !(wallet.readyState === 'Installed' || wallet.readyState === 'Loadable' || wallet.adapter.name == "Coinbase Wallet"),
                providerName: name
            }
            connectors.push(internalConnector)
        }

        return connectors;
    }, [wallets]);
    const isNotAvailableCondition = useCallback((connectorId: string | undefined, network: string | undefined, purpose?: "withdrawal" | "autofill" | "asSource") => {
        if (!network) return false
        if (!connectorId) return true

        if (!purpose) {
            return resolveSupportedNetworks([network], connectorId).length === 0
        }

        const supportedNetworksByPurpose = resolveSupportedNetworks(commonSupportedNetworks, connectorId)
        return supportedNetworksByPurpose.length === 0 || !supportedNetworksByPurpose.includes(network)
    }, [commonSupportedNetworks]);

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets: disconnectWallet,
        isNotAvailableCondition,

        transfer,

        availableWalletsForConnect,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        name,
        id,
        providerIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo,
        ready: wallets.length > 0
    }

    return provider
}

const networkSupport = {
    soon: ["okx wallet", "tokenpocket", "nightly"],
    eclipse: ["nightly", "backpack"],
};

function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
    const supportedNetworksForWallet: string[] = [];

    supportedNetworks.forEach((network) => {
        const lowerCaseName = network.split("_")[0].toLowerCase();
        if (lowerCaseName === "solana") {
            supportedNetworksForWallet.push(network);
        } else if (networkSupport[lowerCaseName] && networkSupport[lowerCaseName].includes(connectorId?.toLowerCase())) {
            supportedNetworksForWallet.push(network);
        }
    });

    return supportedNetworksForWallet;
}
