import { NetworkType, NetworkWithTokens } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useConnectModal } from "../../../components/WalletModal"
import { useConnect, useAccount, useConfig } from '@bigmi/react'
import { disconnect } from "@bigmi/client"
import { useEffect, useMemo, useState } from "react"
import convertSvgComponentToBase64 from "../../../components/utils/convertSvgComponentToBase64"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import KnownInternalNames from "../../knownIds"
import { Connector, CreateConnectorFn } from "@bigmi/client"

const bitcoinNames = [KnownInternalNames.Networks.BitcoinMainnet, KnownInternalNames.Networks.BitcoinTestnet]

export default function useBitcoin(): WalletProvider {
    const name = 'Bitcoin'
    const id = 'bitcoin'
    const { networks } = useSettingsState()
    const [resolvedConnectors, setResolvedConnectors] = useState<InternalConnector[]>([])

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Bitcoin).map(l => l.name),
    ]

    const account = useAccount()
    const { connectAsync, connectors } = useConnect()
    const config = useConfig()
    const { setSelectedConnector } = useConnectModal()

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

            const wallet = resolveWallet({
                activeConnection: { address: address, id: connector.id },
                connector,
                addresses: result.accounts as unknown as string[],
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
        const connector = account.connector

        if (!account || !connector) return undefined

        const wallet = resolveWallet({
            activeConnection: { address: account.address || '', id: connector.id },
            connector,
            addresses: account.addresses as string[],
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

    useEffect(() => {
        (async () => {
            const resolvedConnectors: InternalConnector[] = await Promise.all(connectors.map(async (connector) => {
                const provider = await connector.getProvider()
                const isInjected = !!provider
                const installLink = !isInjected ? connectorsConfigs.find(c => c.id === connector.id)?.installLink : undefined
                const internalConnector: InternalConnector = {
                    name: connector.name,
                    id: connector.id,
                    icon: connector.icon,
                    type: isInjected ? 'injected' : 'other',
                    installUrl: installLink,
                }
                return internalConnector
            }))
            setResolvedConnectors(resolvedConnectors)
        })()
    }, [connectors])

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
        providerIcon
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
        addresses: addresses,
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

const connectorsConfigs = [
    {
        id: "XverseProviders.BitcoinProvider",
        name: "Xverse",
        installLink: "https://www.xverse.app/download"
    },
    {
        id: "app.phantom.bitcoin",
        name: 'Phantom',
        installLink: "https://phantom.com/download"
    },
    {
        id: "unisat",
        name: 'UniSat',
        installLink: "https://unisat.io/"
    },
    {
        id: "io.xdefi.bitcoin",
        name: 'Ctrl',
        installLink: "https://ctrl.xyz/download/"
    },
    {
        id: "com.okex.wallet.bitcoin",
        name: 'OKX Wallet',
        installLink: "https://web3.okx.com/"
    },
    {
        id: "so.onekey.app.wallet.bitcoin",
        name: 'OneKey',
        installLink: "https://onekey.so/download/"
    },
    {
        id: "LeatherProvider",
        name: 'Leather',
        installLink: "https://leather.io/"
    }
]
