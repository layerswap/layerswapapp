import { NetworkType, NetworkWithTokens } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useConnectModal } from "../../../components/WalletModal"
import { useConnect, useConfig } from '@bigmi/react'
import { disconnect } from "@bigmi/client"
import { useMemo } from "react"
import convertSvgComponentToBase64 from "../../../components/utils/convertSvgComponentToBase64"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import KnownInternalNames from "../../knownIds"
import { Address } from "@/lib/address"
import { useBitcoinConnectors } from "@/components/WalletProviders/BitcoinProvider"
import { Connector, CreateConnectorFn } from "@bigmi/client"
import { useAccount } from "./useAccount"
import { getConnections } from "./getConnections"

const bitcoinNames = [KnownInternalNames.Networks.BitcoinMainnet, KnownInternalNames.Networks.BitcoinTestnet]

export default function useBitcoin(): WalletProvider {
    const name = 'Bitcoin'
    const id = 'bitcoin'
    const { networks } = useSettingsState()
    const { connectors: resolvedConnectors } = useBitcoinConnectors()

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Bitcoin).map(l => l.name),
    ]

    const { connectAsync, connectors } = useConnect()
    const { setSelectedConnector } = useConnectModal()

    const config = useConfig()
    const account = useAccount()

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
            const wrongChanin = !Address.isValid(address, network)

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

    const resolvedWallet = useMemo(() => {
        const connections = getConnections(config)
        const connector = connections.find(c => c.connector.id === account.connector?.id)?.connector

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

    const provider: WalletProvider = {
        connectWallet,
        disconnectWallets,
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
        ready: connectors.length > 0
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