import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { NetworkType } from "@/Models/Network"
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/lib/wallets/types/wallet"
import { useMemo } from "react"
import { useSettingsState } from "@/context/settings"
import { configureAndSendCurrentTransaction } from "./services/transferService/transactionSender"

const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

export default function useSVMConnection(): WalletConnectionProvider {
    const { networks } = useSettingsState() 

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ]

    const name = 'Solana'
    const id = 'solana'
    const { disconnect, select, wallets, signTransaction } = useWallet();

    const connectedWallet = wallets.find(w => w.adapter.connected === true)
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const connectedWallets = useMemo(() => {

        const wallet: Wallet | undefined = (connectedAddress && connectedAdapterName) ? {
            id: connectedAdapterName,
            address: connectedAddress,
            displayName: `${connectedWallet?.adapter.name} - Solana`,
            providerName: name,
            icon: resolveWalletConnectorIcon({ connector: String(connectedAdapterName), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
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

    }, [connectedAddress, connectedAdapterName])


    const switchAccount = async (wallet: Wallet, address: string) => {
        // as we do not have multiple accounts management we will leave the method empty
    }

    const connectWallet = async ({ connector }: { connector: InternalConnector }) => {
        const solanaConnector = wallets.find(w => w.adapter.name.includes(connector.name))
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
            icon: resolveWalletConnectorIcon({ connector: String(newConnectedWallet?.adapter.name), address: connectedAddress, iconUrl: newConnectedWallet?.adapter.icon }),
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
            console.log(e)
        }
    }

    const transfer: WalletConnectionProvider['transfer'] = async (params) => {
        const { callData, network, token, amount, balances } = params

        const { Connection, Transaction, LAMPORTS_PER_SOL } = await import("@solana/web3.js")
        
        if (!signTransaction) throw new Error('Missing signTransaction')

        const connection = new Connection(
            `${network.node_url}`,
            "confirmed"
        );

        const arrayBufferCallData = Uint8Array.from(atob(callData), c => c.charCodeAt(0))
        const transaction = Transaction.from(arrayBufferCallData)

        const feeInLamports = await transaction.getEstimatedFee(connection)
        const feeInSol = feeInLamports / LAMPORTS_PER_SOL

        const nativeTokenBalance = balances?.find(b => b.token == network?.token?.symbol)
        const tokenbalanceData = balances?.find(b => b.token == token?.symbol)
        const tokenBalanceAmount = tokenbalanceData?.amount
        const nativeTokenBalanceAmount = nativeTokenBalance?.amount

        const insufficientTokensArr: string[] = []

        if (network?.token && (Number(nativeTokenBalanceAmount) < feeInSol || isNaN(Number(nativeTokenBalanceAmount)))) {
            insufficientTokensArr.push(network.token?.symbol);
        }
        if (network?.token?.symbol !== token?.symbol && amount && token?.symbol && Number(tokenBalanceAmount) < amount) {
            insufficientTokensArr.push(token?.symbol);
        }

        if (insufficientTokensArr.length > 0) throw new Error('Insufficient tokens')

        const signature = await configureAndSendCurrentTransaction(
            transaction,
            connection,
            signTransaction
        );

        return signature;
    }

    const availableWalletsForConnect = useMemo(() => {
        const connectors: InternalConnector[] = [];

        for (const wallet of wallets) {

            const internalConnector: InternalConnector = {
                name: wallet.adapter.name.trim(),
                id: wallet.adapter.name.trim(),
                icon: wallet.adapter.icon,
                type: wallet.readyState === 'Installed' ? 'injected' : 'other',
                installUrl: (wallet.readyState === 'Installed' || wallet.readyState === 'Loadable') ? undefined : wallet.adapter?.url,
            }

            connectors.push(internalConnector)
        }

        return connectors;
    }, [wallets]);

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets: disconnectWallet,
        isNotAvailableCondition: isNotAvailable,
        switchAccount,

        transfer,

        availableWalletsForConnect,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        name,
        id,
        providerIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
    }

    return provider
}

const isNotAvailable = (connector: string | undefined, network: string | undefined) => {
    if (!network) return false
    if (!connector) return true
    return resolveSupportedNetworks([network], connector).length === 0
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