import { useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { CreateConnectorFn, getAccount, getConnections } from '@wagmi/core'
import { useCallback, useMemo } from "react"
import { NetworkType, NetworkWithTokens, InternalConnector, Wallet, WalletConnectionProvider, WalletConnectionProviderProps } from "@layerswap/widget/types"
import { isMobile, sleep, convertSvgComponentToBase64, useConnectModal, KnownInternalNames } from "@layerswap/widget/internal"
import { evmConnectorNameResolver, resolveEVMWalletConnectorIcon, resolveEVMWalletConnectorIndex } from "./evmUtils"
import KnownEVMConnectors from "./evmUtils/KnownEVMConnectors"
import { LSConnector } from "./connectors/types"
import { explicitInjectedProviderDetected } from "./connectors/explicitInjectedProviderDetected"
import { useEvmConnectors, HIDDEN_WALLETCONNECT_ID } from "./EVMProvider/evmConnectorsContext"
import { useActiveEvmAccount } from "./EVMProvider/ActiveEvmAccount"
import { useEVMTransfer } from "./transferProvider/useEVMTransfer"
import { name, id, ethereumNames, immutableZKEvm } from "./constants"

export default function useEVMConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const isMobilePlatform = useMemo(() => isMobile(), []);

    const asSourceSupportedNetworks = useMemo(() => [
        ...networks.filter(network => network.type === NetworkType.EVM).map(l => l.name),
        KnownInternalNames.Networks.ZksyncMainnet,
        KnownInternalNames.Networks.LoopringGoerli,
        KnownInternalNames.Networks.LoopringMainnet,
        KnownInternalNames.Networks.LoopringSepolia
    ], [networks])

    const withdrawalSupportedNetworks = useMemo(() => [
        ...asSourceSupportedNetworks,
    ], [asSourceSupportedNetworks])

    const autofillSupportedNetworks = useMemo(() => [
        ...asSourceSupportedNetworks,
        KnownInternalNames.Networks.ImmutableXMainnet,
        KnownInternalNames.Networks.ImmutableXSepolia,
        KnownInternalNames.Networks.BrineMainnet,
        KnownInternalNames.Networks.HyperliquidMainnet,
        KnownInternalNames.Networks.HyperliquidTestnet,
    ], [asSourceSupportedNetworks])

    const isNotAvailableCondition = useCallback((connectorId: string | undefined, network: string | undefined, purpose?: "withdrawal" | "autofill" | "asSource") => {
        if (!network) return false
        if (!connectorId) return true

        if (!purpose) {
            return resolveSupportedNetworks([network], connectorId).length === 0
        }

        const supportedNetworksByPurpose = resolveSupportedNetworks(
            purpose === "withdrawal" ? withdrawalSupportedNetworks :
                purpose === "autofill" ? autofillSupportedNetworks :
                    asSourceSupportedNetworks,
            connectorId
        )

        return supportedNetworksByPurpose.length === 0 || !supportedNetworksByPurpose.includes(network)
    }, [withdrawalSupportedNetworks, autofillSupportedNetworks, asSourceSupportedNetworks])

    const { disconnectAsync } = useDisconnect()
    const { switchAccountAsync } = useSwitchAccount()
    const { activeConnection, setActiveAddress } = useActiveEvmAccount()
    const allConnectors = useConnectors()
    const config = useConfig()
    const { connectAsync } = useConnect();

    const { setSelectedConnector } = useConnectModal()
    const { walletConnectConnectors, addToAdditionalWallets } = useEvmConnectors()

    const disconnectWallet = useCallback(async (connectorName: string) => {

        try {
            const connections = getConnections(config)
            const connector = connections.find(c => c.connector.name.toLowerCase() === connectorName.toLowerCase())?.connector
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
            //TODO: handle error
            console.log(e)
        }
    }, [config, disconnectAsync])

    const disconnectWallets = useCallback(() => {
        try {
            const connections = getConnections(config)
            connections.forEach(async (connection) => {
                disconnectWallet(connection.connector.name)
            })
        }
        catch (e) {
            //TODO: handle error
            console.log(e)
        }
    }, [config, disconnectWallet])

    const availableFeaturedWalletsForConnect: InternalConnector[] = useMemo(() => {
        const activeBrowserWallet = explicitInjectedProviderDetected() && allConnectors.filter(c => c.id !== "com.immutable.passport" && c.type === "injected").length === 1
        // Filter out hidden connector and handle injected wallet logic
        const filterConnectors = wallet => (
            (wallet.id === "injected" ? activeBrowserWallet : true) &&
            wallet.id !== HIDDEN_WALLETCONNECT_ID
        )

        return dedupePreferInjected(allConnectors.filter(filterConnectors))
            .map(w => {
                const walletConnectWallet = walletConnectConnectors.find(w2 => w2.name.toLowerCase().includes(w.name.toLowerCase()) || w2.id.toLowerCase() === w.id.toLowerCase())
                const isWalletConnectSupported = w.type === "walletConnect" || w.name === "WalletConnect"
                const type = ((w.type == 'injected' && w.id !== 'com.immutable.passport') || w.id === "metaMaskSDK" || isWalletConnectSupported) ? w.type : "other"
                const resolvedConnectorName = evmConnectorNameResolver(w)
                const knownConnector = KnownEVMConnectors.find(c => c.id.toLowerCase() === resolvedConnectorName.toLowerCase())

                return {
                    ...w,
                    order: resolveEVMWalletConnectorIndex(w.id),
                    type: type,
                    isMobileSupported: isWalletConnectSupported,
                    installUrl: walletConnectWallet?.installUrl,
                    hasBrowserExtension: walletConnectWallet?.hasBrowserExtension,
                    extensionNotFound: walletConnectWallet?.hasBrowserExtension ? (type == 'walletConnect' && !isMobilePlatform) : false,
                    icon: w.icon || (knownConnector ? convertSvgComponentToBase64(knownConnector.icon) || walletConnectWallet?.icon : undefined),
                    providerName: name
                }
            })
    }, [allConnectors, walletConnectConnectors])

    const connectWallet = useCallback(async (props: { connector: InternalConnector & LSConnector & { showQrCode?: boolean } }) => {
        try {
            const internalConnector = props?.connector;
            if (!internalConnector) return;
            let connector = availableFeaturedWalletsForConnect.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector

            // For dynamic wallets not in config, use the hidden WalletConnect connector
            // Keep reference to the actual connector for wagmi calls
            let actualConnector = connector

            if (!connector) {
                const walletConnectConnector = walletConnectConnectors.find(w => w.id === internalConnector.id)
                if (!walletConnectConnector) throw new Error("Connector not found")

                // Track that this wallet was used (for recent connectors)
                addToAdditionalWallets(walletConnectConnector)

                // Find the hidden WalletConnect connector by its unique ID
                const wcConnector = allConnectors.find(c => c.id === HIDDEN_WALLETCONNECT_ID)
                if (!wcConnector) throw new Error("Hidden WalletConnect connector not found")

                // Use the actual hidden connector for wagmi operations
                actualConnector = wcConnector as InternalConnector & LSConnector

                // Create a display wrapper that has the wallet-specific metadata
                connector = {
                    ...wcConnector,
                    id: walletConnectConnector.id,
                    name: walletConnectConnector.name,
                    icon: walletConnectConnector.icon,
                    type: 'other', // Not injected - should show QR
                    isMobileSupported: true, // Enable QR code display
                    resolveURI: (uri: string) => {
                        // Use wallet-specific deep link
                        const native = walletConnectConnector.mobile?.native
                        const universal = walletConnectConnector.mobile?.universal
                        if (native) return `${native}wc?uri=${encodeURIComponent(uri)}`
                        if (universal) return `${universal}/wc?uri=${encodeURIComponent(uri)}`
                        return uri
                    }
                } as InternalConnector & LSConnector
            }
            const Icon = connector.icon || resolveEVMWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...connector, icon: base64Icon })
            if (actualConnector.id !== "coinbaseWalletSDK") {
                await actualConnector.disconnect?.()
                await disconnectAsync({ connector: actualConnector })
            }

            if (isMobilePlatform) {
                if (connector.id !== "walletConnect") {
                    // Use actualConnector for getProvider, but connector.resolveURI for deep links
                    getWalletConnectUri(actualConnector, connector?.resolveURI, (uri: string) => {
                        window.location.href = uri;
                    })
                }
            }
            else if (connector.type !== 'injected' && connector.isMobileSupported && connector.id !== "coinbaseWalletSDK" && connector.id !== "metaMaskSDK") {
                setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: internalConnector.showQrCode })
                // Use actualConnector for getProvider, but connector.resolveURI for deep links
                getWalletConnectUri(actualConnector, connector?.resolveURI, (uri: string) => {
                    setSelectedConnector({ ...connector, icon: base64Icon, qr: { state: 'fetched', value: uri }, showQrCode: internalConnector.showQrCode })
                })
            }

            // Set pending metadata BEFORE connectAsync so it's available during re-render
            if (actualConnector.id === HIDDEN_WALLETCONNECT_ID) {
                pendingDynamicWalletMetadata = {
                    name: connector.name,
                    icon: typeof connector.icon === 'string' ? connector.icon : '',
                    id: connector.id
                }
            }

            // Use actualConnector for wagmi connect
            await connectAsync({ connector: actualConnector });

            const activeAccount = await attemptGetAccount(config)

            // If we used the hidden connector, store the wallet metadata for later resolution
            if (actualConnector.id === HIDDEN_WALLETCONNECT_ID && activeAccount.address) {
                setDynamicWalletMetadata(activeAccount.address, pendingDynamicWalletMetadata!)
                pendingDynamicWalletMetadata = null // Clear pending after storing
            }

            const connections = getConnections(config)
            let connection = connections.find(c => c.connector.id === connector?.id)

            if (!connection) {
                const address = await connector.getAccounts()
                const chainId = await connector.getChainId()
                connection = {
                    accounts: address as readonly [`0x${string}`, ...`0x${string}`[]],
                    chainId: Number(chainId),
                    connector
                }
            }

            const wallet = ResolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
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
    }, [availableFeaturedWalletsForConnect, disconnectAsync, networks, asSourceSupportedNetworks, autofillSupportedNetworks, withdrawalSupportedNetworks, name, config, walletConnectConnectors, addToAdditionalWallets, allConnectors, connectAsync])

    const connectedWalletsKey = [...config.state.connections.keys()].join('-')

    const resolvedConnectors: Wallet[] = useMemo(() => {
        const connections = getConnections(config)
        return connections.map((connection): Wallet | undefined => {
            const wallet = ResolveWallet({
                activeConnection: (activeConnection?.id && activeConnection.address) ? {
                    id: activeConnection.id,
                    address: activeConnection.address
                } : undefined,
                connection,
                discconnect: disconnectWallet,
                networks,
                supportedNetworks: {
                    asSource: asSourceSupportedNetworks,
                    autofill: autofillSupportedNetworks,
                    withdrawal: withdrawalSupportedNetworks
                },
                providerName: name
            })

            return wallet
        }).filter(w => w !== undefined)
    }, [activeConnection, config, connectedWalletsKey])

    const switchAccount = useCallback(async (wallet: Wallet, address: string) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
        setActiveAddress(account)
    }, [config, switchAccountAsync])

    const switchChain = async (wallet: Wallet, chainId: string | number) => {
        const connector = getConnections(config).find(c => c.connector.name === wallet.id)?.connector
        if (!connector)
            throw new Error("Connector not found")

        if (connector?.switchChain) {
            await connector.switchChain({ chainId: Number(chainId) });
        } else {
            throw new Error("Switch chain method is not available on the connector");
        }
    }

    const { executeTransfer: transfer } = useEVMTransfer()

    const activeWallet = useMemo(() => resolvedConnectors.find(w => w.isActive), [resolvedConnectors])
    const providerIcon = useMemo(() => networks.find(n => ethereumNames.some(name => name === n.name))?.logo, [networks])

    const provider: WalletConnectionProvider = useMemo(() => {
        return {
            connectWallet,
            disconnectWallets,
            switchAccount,
            switchChain,
            isNotAvailableCondition,

            transfer,

            connectedWallets: resolvedConnectors,
            activeWallet,
            autofillSupportedNetworks,
            withdrawalSupportedNetworks,
            asSourceSupportedNetworks,
            availableWalletsForConnect: availableFeaturedWalletsForConnect,
            availableHiddenWalletsForConnect: walletConnectConnectors,
            name,
            id,
            providerIcon,
            ready: allConnectors.length > 0
        }
    }, [connectWallet, disconnectWallets, switchAccount, resolvedConnectors, availableFeaturedWalletsForConnect, walletConnectConnectors, autofillSupportedNetworks, withdrawalSupportedNetworks, asSourceSupportedNetworks, name, id, networks, allConnectors.length]);

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

type ResolveWalletProps = {
    connection: {
        accounts: readonly [`0x${string}`, ...`0x${string}`[]];
        chainId: number;
        connector: Connector;
    } | undefined,
    networks: NetworkWithTokens[],
    activeConnection: {
        id: string,
        address: string
    } | undefined,
    discconnect: (connectorName: string) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, discconnect, supportedNetworks, providerName } = props
    const walletIsActive = activeConnection?.id === connection?.connector.id
    const addresses = connection?.accounts as (string[] | undefined);
    const activeAddress = activeConnection?.address
    const connector = connection?.connector
    if (!connector)
        return undefined
    const address = walletIsActive ? activeAddress : addresses?.[0]
    if (!address) return undefined

    // Check if this is a dynamic wallet connected via hidden connector
    const isHiddenConnector = connector.id === HIDDEN_WALLETCONNECT_ID
    // Try address-based lookup first, fallback to pending metadata (for first connection)
    const dynamicMetadata = isHiddenConnector
        ? (getDynamicWalletMetadata(address) || pendingDynamicWalletMetadata)
        : null

    // Use dynamic metadata if available, otherwise use connector info
    const walletName = dynamicMetadata?.name || connector.name
    const walletId = dynamicMetadata?.id || connector.id
    const walletIcon = dynamicMetadata?.icon || connector.icon

    const walletDisplayName = `${walletName} ${walletId === "com.immutable.passport" ? "" : " - EVM"}`

    const wallet: Wallet = {
        chainId: connection?.chainId,
        id: walletName,
        internalId: walletId,
        isActive: walletIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletDisplayName,
        providerName,
        icon: resolveEVMWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), address, iconUrl: walletIcon }),
        disconnect: () => discconnect(connector.name),
        asSourceSupportedNetworks: resolveSupportedNetworks(supportedNetworks.asSource, walletId),
        autofillSupportedNetworks: resolveSupportedNetworks(supportedNetworks.autofill, walletId),
        withdrawalSupportedNetworks: resolveSupportedNetworks(supportedNetworks.withdrawal, walletId),
        networkIcon: networks.find(n => walletId === "com.immutable.passport" ? immutableZKEvm.some(name => name === n.name) : ethereumNames.some(name => name === n.name))?.logo,
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
                KnownInternalNames.Networks.ImmutableZkEVM,
                KnownInternalNames.Networks.ImmutableZkTestnet
            ]
        },
        {
            id: "com.roninchain.wallet",
            supportedNetworks: [
                KnownInternalNames.Networks.RoninMainnet,
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
                KnownInternalNames.Networks.BaseMainnet,
                KnownInternalNames.Networks.BNBChainMainnet,
                KnownInternalNames.Networks.ArbitrumMainnet
            ]
        },
        {
            id: "app.phantom",
            supportedNetworks: [
                KnownInternalNames.Networks.EthereumMainnet,
                KnownInternalNames.Networks.BaseMainnet,
                KnownInternalNames.Networks.PolygonMainnet,
                KnownInternalNames.Networks.MonadMainnet
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
        const account = getAccount(config);

        if (account.address) {
            return account;
        }
        await sleep(500);
    }

    return getAccount(config);
}
function dedupePreferInjected(arr: Connector<CreateConnectorFn>[]) {
    // Helper to strip off any prefix up to the last dot
    const getBaseId = (id: string) => id.includes('.') ? id.split('.').pop()! : id;

    // Group items by normalized base‐id
    const groups = arr.reduce<Record<string, Connector<CreateConnectorFn>[]>>((acc, obj) => {
        const key = getBaseId(obj.name);
        (acc[key] = acc[key] || []).push(obj);
        return acc;
    }, {});

    // Within each group, if any are injected prefer them, otherwise keep all
    return Object.values(groups).flatMap(group => {
        const injected = group.filter(o => o.type === 'injected');
        return injected.length > 0 ? injected : group;
    });
}


// Storage key for dynamic wallet metadata
const DYNAMIC_WALLET_METADATA_KEY = 'ls_dynamic_wallet_metadata'

type DynamicWalletMetadata = {
    name: string
    icon: string
    id: string
}

// Pending metadata for wallets being connected (before address is known)
let pendingDynamicWalletMetadata: DynamicWalletMetadata | null = null

// Get stored metadata for dynamic wallets connected via hidden connector
const getDynamicWalletMetadata = (address: string): DynamicWalletMetadata | null => {
    if (typeof window === 'undefined') return null
    try {
        const stored = localStorage.getItem(DYNAMIC_WALLET_METADATA_KEY)
        if (!stored) return null
        const metadata = JSON.parse(stored) as Record<string, DynamicWalletMetadata>
        return metadata[address.toLowerCase()] || null
    } catch {
        return null
    }
}

// Store metadata for dynamic wallets connected via hidden connector
const setDynamicWalletMetadata = (address: string, metadata: DynamicWalletMetadata): void => {
    if (typeof window === 'undefined') return
    try {
        const stored = localStorage.getItem(DYNAMIC_WALLET_METADATA_KEY)
        const existing = stored ? JSON.parse(stored) : {}
        existing[address.toLowerCase()] = metadata
        localStorage.setItem(DYNAMIC_WALLET_METADATA_KEY, JSON.stringify(existing))
    } catch {
        // Ignore storage errors
    }
}