import { NetworkType, NetworkWithTokens } from "@/Models/Network"
import { useSettingsState } from "@/context/settings"
import { InternalConnector, Wallet, WalletConnectionProvider } from "@/types/wallet"
import { useConnectModal } from "@/components/Wallet/WalletModal"
import { useConnect, useAccount, useConfig } from '@bigmi/react'
import { disconnect } from "@bigmi/client"
import { useMemo } from "react"
import convertSvgComponentToBase64 from "@/components/utils/convertSvgComponentToBase64"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import KnownInternalNames from "../../knownIds"
import { Connector, CreateConnectorFn } from "@bigmi/client"
import { isValidAddress } from "@/lib/address/validator"
import { useBitcoinConnectors } from "@/lib/wallets/bitcoin/BitcoinProvider"
import { sendTransaction } from "./services/transferService/sendTransaction"
import { JsonRpcClient } from "@/lib/apiClients/jsonRpcClient"
import { TransactionMessageType } from "@/components/Pages/Swap/Withdraw/messages/TransactionMessages";

const bitcoinNames = [KnownInternalNames.Networks.BitcoinMainnet, KnownInternalNames.Networks.BitcoinTestnet]

export default function useBitcoinConnection(): WalletConnectionProvider {
    const name = 'Bitcoin'
    const id = 'bitcoin'
    const { networks } = useSettingsState()
    const { connectors: resolvedConnectors } = useBitcoinConnectors()

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Bitcoin).map(l => l.name),
    ]

    const account = useAccount()
    const { connectAsync, connectors } = useConnect()
    const config = useConfig()
    const { setSelectedConnector } = useConnectModal()

    const switchAccount = async (wallet: Wallet, address: string) => {
        // as we do not have multiple accounts management we will leave the method empty
    }

    const disconnectWallet = async (connectorName: string) => {
        try {
            const connector = connectors.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
            await disconnect(config, { connector })
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallets = () => {
        try {
            connectors.forEach(async (connector) => {
                await disconnect(config, { connector })
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectWallet = async ({ connector: internalConnector }: { connector: InternalConnector }) => {
        try {
            const connector = connectors.find(w => w.id === internalConnector.id)
            if (!connector) throw new Error("Connector not found")
            const Icon = connector.icon
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...internalConnector, icon: base64Icon })
            if (account) {
                await disconnect(config, { connector })
            }

            if (!connector) throw new Error("Connector not found")

            const result = await connectAsync({ connector: connector as any });

            if (!result.accounts) throw new Error("No result from connector")

            const address = result.accounts[0]
            const network = networks.find(n => commonSupportedNetworks.includes(n.name))
            const wrongChanin = !isValidAddress(address, network)

            if (address && wrongChanin) {
                await disconnect(config, { connector })
                const isMainnet = network?.name === KnownInternalNames.Networks.BitcoinMainnet
                const errorMessage = `Please switch the network in your wallet to ${isMainnet ? 'Mainnet' : 'Testnet'} and click connect again`
                throw new Error(errorMessage)
            }

            const wallet = resolveWallet({
                activeConnection: { address: address, id: connector.id },
                connector,
                addresses: [address],
                networks,
                discconnect: disconnectWallet,
                supportedNetworks: {
                    asSource: commonSupportedNetworks,
                    autofill: commonSupportedNetworks,
                    withdrawal: commonSupportedNetworks
                },
                providerName: name
            })
            return wallet

        } catch (e) {
            const error = e
            if (error.name == 'ConnectorAlreadyConnectedError') {
                throw new Error("Wallet is already connected");
            } else {
                throw new Error(e.message || e);
            }
        }
    }

    const transfer: WalletConnectionProvider['transfer'] = async (params) => {
        const { amount, callData, depositAddress, selectedWallet, network } = params

        if (!account.connector) {
            throw new Error("Connector not found");
        }
        if (!depositAddress) {
            throw new Error("Deposit address not provided");
        }

        const rpcClient = new JsonRpcClient(network.node_url);
        const isTestnet = network?.name === KnownInternalNames.Networks.BitcoinTestnet;
        const publicClient = config.getClient()

        try {
            const txHash = await sendTransaction({
                amount,
                depositAddress,
                userAddress: selectedWallet.address,
                isTestnet,
                rpcClient,
                callData,
                connector: account.connector,
                publicClient
            });
            return txHash;
        } catch (error) {
            if (error && error.includes('User rejected the request.')) {
                error.name = TransactionMessageType.TransactionRejected
                throw new Error(error)
            }
            else if (error && error.includes('Insufficient balance.')) {
                error.name = TransactionMessageType.InsufficientFunds
                throw new Error(error)
            }
            else {
                error.name = TransactionMessageType.UexpectedErrorMessage
                error.message = error
                throw new Error(error)
            }
        }
    }

    const resolvedWallet = useMemo(() => {
        const connector = account.connector

        if (!account || !connector) return undefined

        const wallet = resolveWallet({
            activeConnection: { address: account.address || '', id: connector.id },
            connector,
            addresses: account.address ? [account.address] : [],
            networks,
            discconnect: disconnectWallet,
            supportedNetworks: {
                asSource: commonSupportedNetworks,
                autofill: commonSupportedNetworks,
                withdrawal: commonSupportedNetworks
            },
            providerName: name
        })

        if (!wallet) return undefined

        return wallet
    }, [account, connectors])

    const providerIcon = networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo

    const provider: WalletConnectionProvider = {
        connectWallet,
        disconnectWallets,
        switchAccount,

        transfer,

        connectedWallets: resolvedWallet ? [resolvedWallet] : [],
        activeWallet: resolvedWallet,
        availableWalletsForConnect: resolvedConnectors,
        autofillSupportedNetworks: commonSupportedNetworks,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon,
        unsupportedPlatforms: ["mobile"],
    }

    return provider
}


type ResolveWalletProps = {
    connector: Connector<CreateConnectorFn>,
    networks: NetworkWithTokens[],
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    addresses: string[],
    discconnect: (connectorName: string) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const resolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connector, networks, discconnect, supportedNetworks, providerName, addresses } = props
    const accountIsActive = activeConnection?.id === connector?.id

    if (!connector)
        return undefined

    const walletname = `${connector?.name} ${" - Bitcoin"}`

    const wallet: Wallet = {
        id: connector.name,
        internalId: connector.id,
        isActive: accountIsActive,
        address: addresses[0],
        addresses: [addresses[0]],
        displayName: walletname,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: connector.name, address: addresses[0], iconUrl: connector.icon }),
        disconnect: () => discconnect(connector.name),
        asSourceSupportedNetworks: supportedNetworks.asSource,
        autofillSupportedNetworks: supportedNetworks.autofill,
        withdrawalSupportedNetworks: supportedNetworks.withdrawal,
        networkIcon: networks.find(n => bitcoinNames.some(name => name === n.name))?.logo,

    }

    return wallet
}