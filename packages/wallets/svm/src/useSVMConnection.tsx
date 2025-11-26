import { useWallet } from "@solana/wallet-adapter-react"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { InternalConnector, Wallet, WalletConnectionProvider, ActionMessageType, NetworkType, WalletConnectionProviderProps } from "@layerswap/widget/types"
import { useMemo } from "react"
import { configureAndSendCurrentTransaction } from "./transferProvider/transactionSender"
import { resolveSolanaWalletConnectorIcon } from "./utils"

const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

export default function useSVMConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ]

    const name = 'Solana'
    const id = 'solana'
    const { disconnect, select, wallets, wallet: solanaWallet, signTransaction } = useWallet();
    const connectedWallet = solanaWallet?.adapter.connected === true ? solanaWallet : undefined
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const connectedWallets = useMemo(() => {

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

    }, [connectedAddress, connectedAdapterName])

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

        try {
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

            if (insufficientTokensArr.length > 0) throw new Error(ActionMessageType.InsufficientFunds)

            const signature = await configureAndSendCurrentTransaction(
                transaction,
                connection,
                signTransaction
            );

            return signature;
        } catch (error) {
            const e = new Error()
            e.message = error.message
            if (error in ActionMessageType) {
                e.name = error
                throw e
            }
            else if (error.message === "User rejected the request.") {
                e.name = ActionMessageType.TransactionRejected
                throw e
            }
            else {
                e.name = ActionMessageType.UnexpectedErrorMessage
                throw e
            }
        }
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