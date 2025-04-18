import { useAccount, useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { Network, NetworkType, NetworkWithTokens } from "../../../Models/Network"
import { useSettingsState } from "../../../context/settings"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useMemo } from "react"
import { getAccount, getConnections } from '@wagmi/core'
import { isMobile } from "../../isMobile"
import convertSvgComponentToBase64 from "../../../components/utils/convertSvgComponentToBase64"
import { LSConnector } from "../connectors/EthereumProvider"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useConnectModal } from "../../../components/Wallet/WalletModal"
import { explicitInjectedproviderDetected } from "../connectors/getInjectedConnector"
import walletsData from "../../../public/walletsData.json"

type Props = {
    network: Network | undefined,
}
const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVM]

export default function useEVM({ network }: Props): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()

    const asSourceSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ]

    const withdrawalSupportedNetworks = [
        ...asSourceSupportedNetworks,
    ]

    const autofillSupportedNetworks = [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXGoerli,
        KnownInternalNames.Networks.BrineMainnet,
    ]

    const { disconnectAsync } = useDisconnect()
    const { connectors: activeConnectors, switchAccountAsync } = useSwitchAccount()
    const activeAccount = useAccount()
    const allConnectors = useConnectors()
    const config = useConfig()
    const { connectAsync } = useConnect();

    const { connect, setSelectedConnector } = useConnectModal()

    const connectWallet = async () => {
        try {
            return await connect(provider)
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallet = async (connectorName: string) => {

        try {
            const connector = activeConnectors.find(w => w.name.toLowerCase() === connectorName.toLowerCase())
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const disconnectWallets = () => {
        try {
            activeConnectors.forEach(async (connector) => {
                disconnectWallet(connector.name)
            })
        }
        catch (e) {
            console.log(e)
        }
    }

    const connectConnector = async ({ connector }: { connector: InternalConnector & LSConnector }) => {
        try {
            const Icon = connector.icon || resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...connector, icon: base64Icon })
            if (connector.id !== "coinbaseWalletSDK") {
                await connector.disconnect()
                await disconnectAsync({ connector })
            }

            if (isMobile()) {
                if (connector.id !== "walletConnect") {
                    getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                        window.location.href = uri;
                    })
                }
            }
            else if (connector.type !== 'injected' && connector.id !== "coinbaseWalletSDK") {
                setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined } })
                getWalletConnectUri(connector, connector?.resolveURI, (uri: string) => {
                    setSelectedConnector({ ...connector, icon: base64Icon, qr: { state: 'fetched', value: uri } })
                })
            }

            await connectAsync({ connector });

            const activeAccount = await attemptGetAccount(config)
            const connections = getConnections(config)
            const connection = connections.find(c => c.connector.id === connector?.id)

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                network,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet

        } catch (e) {
            //TODO: handle error like in transfer
            const error = e
            if (error.name == 'ConnectorAlreadyConnectedError') {
                throw new Error("Wallet is already connected");
            } else {
                throw new Error(e.message || e);
            }
        }
    }

    const resolvedConnectors: Wallet[] = useMemo(() => {
        const connections = getConnections(config)
        return activeConnectors.map((w): Wallet | undefined => {

            const connection = connections.find(c => c.connector.id === w.id)

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                network,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined) as Wallet[]
    }, [activeAccount, activeConnectors, config, network])

    const switchAccount = async (wallet: Wallet, address: string) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
    }


    const activeBrowserWallet = explicitInjectedproviderDetected() && allConnectors.filter(c => c.id !== "com.immutable.passport" && c.type === "injected").length === 1
    const filterConnectors = wallet => !isNotAvailable(wallet, network) && ((wallet.id === "injected" ? activeBrowserWallet : true))

    const fetchedWallets = useMemo(() => Object.values(walletsData.listings), [])

    {/* //TODO: refactor ordering */ }
    const availableWalletsForConnect = allConnectors.filter(filterConnectors)
        .map(w => {
            const isMobileSupported = fetchedWallets.some(w2 => w2.name.toLowerCase() === w.name.toLowerCase() && w2.mobile.native)
            return {
                ...w,
                order: resolveWalletConnectorIndex(w.id),
                type: (w.type == 'injected' && w.id !== 'com.immutable.passport') ? w.type : "other",
                isMobileSupported
            }
        })

    const provider = {
        connectWallet,
        connectConnector,
        disconnectWallets,
        switchAccount,
        connectedWallets: resolvedConnectors,
        activeWallet: resolvedConnectors.find(w => w.isActive),
        autofillSupportedNetworks,
        withdrawalSupportedNetworks,
        asSourceSupportedNetworks,
        availableWalletsForConnect: availableWalletsForConnect as InternalConnector[],
        name,
        id,
        providerIcon: networks.find(n => ethereumNames.some(name => name === n.name))?.logo
    }

    return provider
}


const getWalletConnectUri = async (
    connector: Connector,
    uriConverter: (uri: string) => string = (uri) => uri,
    useCallback: (uri: string) => void,
): Promise<void> => {
    const provider = await connector.getProvider();
    if (connector.id === 'coinbase') {
        // @ts-expect-error
        return provider.qrUrl;
    }
    return new Promise<void>((resolve) => {
        return provider?.['once'] && provider['once']('display_uri', (uri) => {
            resolve(useCallback(uriConverter(uri)));
        })
    }
    );
};

const isNotAvailable = (connector: Connector | undefined, network: Network | undefined) => {
    if (!network) return false
    if (!connector) return true
    return resolveSupportedNetworks([network.name], connector.id).length === 0
}

type ResolveWalletProps = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]];
        chainId: number;
        connector: Connector;
    } | undefined,
    networks: NetworkWithTokens[],
    network: Network | undefined,
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    discconnect: (connectorName: string | undefined) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, discconnect, network, supportedNetworks, providerName } = props
    const accountIsActive = activeConnection?.id === connection?.connector.id

    const addresses = connection?.accounts as (string[] | undefined);
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector)
        return undefined
    const address = accountIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    const walletname = `${connector?.name} ${connector.id === "com.immutable.passport" ? "" : " - EVM"}`

    const wallet: Wallet = {
        id: connector.name,
        isActive: accountIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletname,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), address, iconUrl: connector.icon }),
        disconnect: () => discconnect(connector.name),
        isNotAvailable: isNotAvailable(connector, network),
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, connector.id),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, connector.id),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, connector.id),
        networkIcon: networks.find(n => connector?.id === "com.immutable.passport" ? immutableZKEvm.some(name => name === n.name) : ethereumNames.some(name => name === n.name))?.logo,
        metadata: {
            deepLink: (connector as LSConnector).deepLink
        }
    }

    return wallet
}

const resolveSupportedNetworks = (supportedNetworks: string[], connectorId: string) => {

    const specificNetworksConnectors = [
        {
            id: "com.immutable.passport",
            supportedNetworks: [
                KnownInternalNames.Networks.ImmutableXMainnet,
                KnownInternalNames.Networks.ImmutableXGoerli,
                KnownInternalNames.Networks.ImmutableXSepolia,
                KnownInternalNames.Networks.ImmutableZkEVM
            ]
        },
        {
            id: "com.roninchain.wallet",
            supportedNetworks: [
                KnownInternalNames.Networks.RoninMainnet,
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
                KnownInternalNames.Networks.BNBChainMainnet,
                KnownInternalNames.Networks.ArbitrumMainnet
            ]
        }
    ]

    const specificNetworks = specificNetworksConnectors.find(c => c.id === connectorId)

    if (specificNetworks) {
        const values = specificNetworks.supportedNetworks.filter(n => supportedNetworks.some(name => name === n))
        return values
    }

    return supportedNetworks

}

async function attemptGetAccount(config, maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const account = await getAccount(config);

        if (account.address) {
            return account;
        }
        await sleep(500);
    }

    return await getAccount(config);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
