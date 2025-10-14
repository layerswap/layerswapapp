import KnownInternalNames from "../../knownIds";
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/types";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useSettingsState } from "../../../context/settings";
import { GasResolver } from "@/lib/gases/gasResolver";
import { buildInitialTransaction } from "./services/transferService/transactionBuilder";
import { GasWithToken } from "@/types/gas";
import { TransactionMessageType } from "@/components/Pages/Swap/Withdraw/messages/TransactionMessages";

export default function useTronConnection(): WalletConnectionProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.TronMainnet,
        KnownInternalNames.Networks.TronTestnet
    ]

    const { networks } = useSettingsState()
    const network = networks.find(n => n.name === KnownInternalNames.Networks.TronMainnet || n.name === KnownInternalNames.Networks.TronTestnet)
    const name = 'Tron'
    const id = 'tron'
    const { wallets, wallet: tronWallet, disconnect, select, signTransaction } = useWallet();

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
        providerName: id,
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

    const transfer: WalletConnectionProvider['transfer'] = async (params, wallet) => {

        const { callData, amount, depositAddress, token, network, selectedWallet } = params

        if (!selectedWallet?.address) {
            throw new Error('Wallet address not found')
        }
        if (!depositAddress) {
            throw new Error('Deposit address not found')
        }

        const tronNode = network?.node_url
        const TronWeb = (await import('tronweb')).TronWeb

        try {
            const tronWeb = new TronWeb({ fullNode: tronNode, solidityNode: tronNode });

            const gasData: GasWithToken | undefined = await new GasResolver().getGas({ address: selectedWallet?.address, network, token })

            const amountInWei = Math.pow(10, token?.decimals) * amount

            const initialTransaction = await buildInitialTransaction({ tronWeb, token: token, depositAddress, amountInWei, gas: gasData?.gas, issuerAddress: selectedWallet?.address })
            const data = Buffer.from(callData).toString('hex')
            const transaction = await tronWeb.transactionBuilder.addUpdateData(initialTransaction, data, "hex")
            const signature = await signTransaction(transaction)
            const res = await tronWeb.trx.sendRawTransaction(signature)

            if (signature && res.result) {
                return signature.txID
            }
        } catch (error) {
            if (error === "BANDWITH_ERROR") {
                error.name = TransactionMessageType.InsufficientFunds
                throw new Error(error)
            }
            else if (error === "user reject this request") {
                error.name = TransactionMessageType.TransactionRejected
                throw new Error(error)
            }
            else {
                error.name = TransactionMessageType.UexpectedErrorMessage
                error.message = error
                throw new Error(error)
            }
        }

    }

    const availableWalletsForConnect: InternalConnector[] = wallets.map(wallet => {
        return {
            id: wallet.adapter.name,
            name: wallet.adapter.name,
            icon: wallet.adapter.icon,
            type: wallet.state !== 'NotFound' ? 'injected' : 'other',
            installUrl: wallet.state !== 'NotFound' ? undefined : wallet.adapter?.url,
        }
    })

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets: disconnectWallet,

        transfer,

        availableWalletsForConnect,
        connectedWallets: getWallet(),
        activeWallet: wallet,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon: network?.logo,
        switchAccount
    }

    return provider
}