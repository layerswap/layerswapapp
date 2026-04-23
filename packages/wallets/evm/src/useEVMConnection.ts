import { useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { CreateConnectorFn, getAccount, getConnections } from '@wagmi/core'
import { useCallback, useEffect, useMemo } from "react"
import { NetworkType, NetworkWithTokens, InternalConnector, Wallet, WalletConnectionProvider, WalletConnectionProviderProps } from "@layerswap/widget/types"
import { isMobile, sleep, convertSvgComponentToBase64, useConnectModal, KnownInternalNames } from "@layerswap/widget/internal"
import { evmConnectorNameResolver, resolveEVMWalletConnectorIcon, resolveEVMWalletConnectorIndex } from "./evmUtils"
import KnownEVMConnectors from "./evmUtils/KnownEVMConnectors"
import { LSConnector } from "./connectors/types"
import { explicitInjectedProviderDetected } from "./connectors/explicitInjectedProviderDetected"
import { useActiveEvmAccount } from "./EVMProvider/ActiveEvmAccount"
import { useEVMTransfer } from "./transferProvider/useEVMTransfer"
import { name, id, ethereumNames, immutableZKEvm, featuredWalletsIds, HIDDEN_WALLETCONNECT_ID } from "./constants"

const EVM_NS = 'eip155'

type DynamicWalletMetadata = DynamicWalletMetadata

const getDynamicWalletMetadata = (address: string) => getDynamicWcMetadata(EVM_NS, address)
const setDynamicWalletMetadata = (address: string, metadata: DynamicWalletMetadata) =>
    setDynamicWcMetadata(EVM_NS, address, metadata)

// Adapts a wagmi `Connector` to the shared `DisplayUriSource` contract.
// Subscribes synchronously to the connector's emitter — wagmi connectors
// (including the custom one in ./connectors/resolveConnectors/walletConnect.ts)
// re-emit `display_uri` as a `message` event via `config.emitter.emit('message',
// { type: 'display_uri', data: uri })`. Registering synchronously avoids a race
// where `display_uri` fires before an async `getProvider()` resolves, which
// would leave the QR modal stuck in the `loading` state.
const wagmiDisplayUriSource = (connector: Connector): DisplayUriSource => ({
    onDisplayUri(listener) {
        const handler = ({ type, data }: { type: string; data?: unknown }) => {
            if (type === 'display_uri' && typeof data === 'string') listener(data)
        }
        connector.emitter.on('message', handler)
        return () => {
            try { connector.emitter.off('message', handler) } catch { /* noop */ }
        }
    },
})

const isFeaturedRegistryWallet = (wallet: WalletConnectWalletBase) => (
    featuredWalletsIds.includes(wallet.id.toLowerCase())
    || featuredWalletsIds.some(featuredId => wallet.name.toLowerCase().includes(featuredId))
)

const splitRegistryConnectors = (
    configuredConnectors: InternalConnector[],
    registryWallets: WalletConnectWalletBase[],
    isMobilePlatform: boolean,
    providerName: string
) => {
    const existingConnectorKeys = new Set(
        configuredConnectors.flatMap(connector => [connector.id.toLowerCase(), connector.name.toLowerCase()])
    )

    return registryWallets.reduce<{ featured: RegistryConnector[], additional: RegistryConnector[] }>((acc, wallet) => {
        if (existingConnectorKeys.has(wallet.id.toLowerCase()) || existingConnectorKeys.has(wallet.name.toLowerCase())) {
            return acc
        }

        const connector = createRegistryConnector(wallet, isMobilePlatform, providerName)

        if (isFeaturedRegistryWallet(wallet)) {
            acc.featured.push(connector)
        } else {
            acc.additional.push(connector)
        }

        return acc
    }, { featured: [], additional: [] })
}

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

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const {
        browseConnectors: walletConnectConnectors,
        browseMetadata: walletConnectBrowseMetadata,
        requestAdditionalConnectors: requestRegistryConnectors,
        addRecentConnector: addWalletConnectWallet,
    } = useAdditionalConnectors(EVM_NS)

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectBrowseMetadata.loaded) {
            requestRegistryConnectors({ page: 1, pageSize: 40 }).catch((error) => console.warn('Failed to load WalletConnect wallets registry', error))
        }
    }, [isWalletModalOpen, walletConnectBrowseMetadata.loaded, requestRegistryConnectors])

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

    const configuredConnectors: InternalConnector[] = useMemo(() => {
        const activeBrowserWallet = explicitInjectedProviderDetected() && allConnectors.filter(c => c.id !== "com.immutable.passport" && c.type === "injected").length === 1
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
    }, [allConnectors, walletConnectConnectors, isMobilePlatform, name])

    const { featured: featuredDynamicConnectors, additional: additionalConnectors } = useMemo(() => {
        return splitRegistryConnectors(configuredConnectors, walletConnectConnectors, isMobilePlatform, name)
    }, [configuredConnectors, walletConnectConnectors, isMobilePlatform, name])

    const availableConnectors = useMemo(() => {
        return [...configuredConnectors, ...featuredDynamicConnectors]
    }, [configuredConnectors, featuredDynamicConnectors])

    const requestAdditionalConnectors = useCallback(async (params: RequestAdditionalConnectorsParams = {}): Promise<RequestAdditionalConnectorsResult> => {
        const result = await requestRegistryConnectors(params)
        return {
            connectors: splitRegistryConnectors(configuredConnectors, result.connectors, isMobilePlatform, name).additional,
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }, [configuredConnectors, requestRegistryConnectors, isMobilePlatform, name])

    const connectWallet = useCallback(async (props: { connector: WalletModalConnector }) => {
        let unsubscribeDisplayUri: (() => void) | undefined
        let registryBase = undefined as ReturnType<typeof getRegistryEntry>
        try {
            const internalConnector = props?.connector;
            if (!internalConnector) return;
            let connector = availableConnectors.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector
            let actualConnector = connector

            registryBase = getRegistryEntry(internalConnector) ?? getRegistryEntry(connector)

            if (registryBase) {
                addWalletConnectWallet(registryBase)

                const wcConnector = allConnectors.find(c => c.id === HIDDEN_WALLETCONNECT_ID)
                if (!wcConnector) throw new Error("Hidden WalletConnect connector not found")
                actualConnector = wcConnector as InternalConnector & LSConnector

                const resolveURI = (uri: string) => buildDeepLink({ id: registryBase!.id, mobile: registryBase!.mobile }, uri)
                connector = Object.assign({}, wcConnector, {
                    id: registryBase.id,
                    name: registryBase.name,
                    icon: registryBase.icon,
                    type: 'other',
                    isMobileSupported: true,
                    resolveURI,
                }) as InternalConnector & LSConnector
            } else if (!connector || typeof connector.disconnect !== 'function') {
                throw new Error("Connector not found")
            }
            const Icon = connector.icon || resolveEVMWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
            const base64Icon = typeof Icon == 'string' ? Icon : convertSvgComponentToBase64(Icon)
            setSelectedConnector({ ...connector, icon: base64Icon })
            if (actualConnector.id !== "coinbaseWalletSDK" && typeof actualConnector.disconnect === 'function') {
                await actualConnector.disconnect()
                await disconnectAsync({ connector: actualConnector })
            }

            const resolveURI = connector.resolveURI as ((uri: string) => string | undefined) | undefined
            const showQrCode = (internalConnector as any)?.showQrCode
            const wantsMobileRedirect = isMobilePlatform && connector.id !== "walletConnect" && !!resolveURI
            const wantsQrModal = !isMobilePlatform
                && connector.type !== 'injected'
                && !!connector.isMobileSupported
                && connector.id !== "coinbaseWalletSDK"
                && connector.id !== "metaMaskSDK"

            if (wantsQrModal) {
                setSelectedConnector({ ...connector, icon: base64Icon, qr: { state: 'loading', value: undefined }, showQrCode })
            }

            if (wantsMobileRedirect || wantsQrModal) {
                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wagmiDisplayUriSource(actualConnector),
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnector({ ...connector, icon: base64Icon, qr, showQrCode }),
                })
            }

            // Always prime pending metadata for registry-origin connects so the
            // `connectedWallets` re-render that happens between connect start and
            // address resolution can render the right wallet name/icon.
            const pendingMetadata = setPendingMetadataForRegistry(EVM_NS, registryBase)

            try {
                await connectAsync({ connector: actualConnector });
            } finally {
                unsubscribeDisplayUri?.()
                unsubscribeDisplayUri = undefined
            }

            const activeAccount = await attemptGetAccount(config)

            if (registryBase && pendingMetadata && activeAccount.address) {
                setDynamicWalletMetadata(activeAccount.address, pendingMetadata)
            }
            clearPendingDynamicWcMetadata(EVM_NS)

            const connections = getConnections(config)
            let connection = connections.find(c => c.connector.id === connector?.id)

            if (!connection) {
                const accounts = await connector.getAccounts()
                if (!accounts?.length) {
                    throw new Error('No accounts returned from wallet')
                }
                const chainId = await connector.getChainId()
                connection = {
                    accounts: accounts as readonly [`0x${string}`, ...`0x${string}`[]],
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
                disconnect: disconnectWallet,
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
            throw mapConnectError(e)
        } finally {
            unsubscribeDisplayUri?.()
            if (registryBase) clearPendingDynamicWcMetadata(EVM_NS)
        }
    }, [availableConnectors, disconnectAsync, networks, asSourceSupportedNetworks, autofillSupportedNetworks, withdrawalSupportedNetworks, name, config, addWalletConnectWallet, allConnectors, connectAsync, isMobilePlatform, setSelectedConnector, disconnectWallet])

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
                disconnect: disconnectWallet,
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
    }, [activeConnection, config, connectedWalletsKey, disconnectWallet, networks, asSourceSupportedNetworks, autofillSupportedNetworks, withdrawalSupportedNetworks, name])

    const resolveWalletConnector = useCallback((wallet: Wallet) => {
        const connections = getConnections(config)
        return connections.find(c => c.connector.name === wallet.id)?.connector
            ?? connections.find(c =>
                c.connector.id === HIDDEN_WALLETCONNECT_ID
                && c.accounts.some(a => a.toLowerCase() === wallet.address.toLowerCase())
            )?.connector
    }, [config])

    const switchAccount = useCallback(async (wallet: Wallet, address: string) => {
        const connector = resolveWalletConnector(wallet)
        if (!connector)
            throw new Error("Connector not found")
        const { accounts } = await switchAccountAsync({ connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account)
            throw new Error("Account not found")
        setActiveAddress(account)
    }, [resolveWalletConnector, switchAccountAsync])

    const switchChain = async (wallet: Wallet, chainId: string | number) => {
        const connector = resolveWalletConnector(wallet)
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
            availableConnectors,
            additionalConnectors,
            name,
            id,
            providerIcon,
            ready: allConnectors.length > 0,
            requestAdditionalConnectors,
        }
    }, [connectWallet, disconnectWallets, switchAccount, switchChain, isNotAvailableCondition, resolvedConnectors, activeWallet, autofillSupportedNetworks, withdrawalSupportedNetworks, asSourceSupportedNetworks, availableConnectors, additionalConnectors, name, id, providerIcon, allConnectors.length, requestAdditionalConnectors]);

    return provider
}


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
    disconnect: (connectorName: string) => Promise<void>,
    supportedNetworks: {
        asSource: string[],
        autofill: string[],
        withdrawal: string[]
    },
    providerName: string
}

const ResolveWallet = (props: ResolveWalletProps): Wallet | undefined => {
    const { activeConnection, connection, networks, disconnect, supportedNetworks, providerName } = props
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
        ? (getDynamicWalletMetadata(address) || getPendingDynamicWcMetadata(EVM_NS))
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
        disconnect: () => disconnect(connector.name),
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

async function attemptGetAccount(config: Parameters<typeof getAccount>[0], maxAttempts = 5) {
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
