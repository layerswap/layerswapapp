import { useConfig, useConnect, useConnectors, useDisconnect, useSwitchAccount, Connector } from "wagmi"
import { NetworkType, NetworkWithTokens } from "@/Models/Network"
import { useSettingsState } from "@/context/settings"
import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { evmConnectorNameResolver } from "./KnownEVMConnectors"
import { useCallback, useEffect, useMemo } from "react"
import { CreateConnectorFn, getAccount, getConnections } from '@wagmi/core'
import { isMobile } from "../../isMobile"
import convertSvgComponentToBase64 from "@/components/utils/convertSvgComponentToBase64"
import { LSConnector } from "../connectors/types"
import { InternalConnector, Wallet, WalletProvider } from "@/Models/WalletProvider"
import { useConnectModal, WalletModalConnector } from "@/components/WalletModal"
import { explicitInjectedProviderDetected } from "../connectors/explicitInjectedProviderDetected"
import sleep from "../utils/sleep"
import { useEvmConnectors, HIDDEN_WALLETCONNECT_ID, featuredWalletsIds } from "@/context/evmConnectorsContext"
import { useActiveEvmAccount } from "@/components/WalletProviders/ActiveEvmAccount"
import {
    getDynamicWcMetadata,
    setDynamicWcMetadata,
    setPendingDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    clearPendingDynamicWcMetadata,
} from "@/lib/wallets/walletConnect/dynamicMetadata"
import { DynamicWcMetadata, WC_REGISTRY_MARKER, getRegistryEntry, type RegistryAttachedConnector } from "@/lib/wallets/walletConnect/types"
import { buildDeepLink } from "@/lib/wallets/walletConnect/buildDeepLink"
import { subscribeDisplayUri, type DisplayUriSource } from "@/lib/wallets/walletConnect/subscribeDisplayUri"
import { mapConnectError } from "@/lib/wallets/walletConnect/mapConnectError"

const EVM_NS = 'eip155'

type DynamicWalletMetadata = DynamicWcMetadata

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

const ethereumNames = [KnownInternalNames.Networks.EthereumMainnet, KnownInternalNames.Networks.EthereumSepolia]
const immutableZKEvm = [KnownInternalNames.Networks.ImmutableZkEVM]

export default function useEVM(): WalletProvider {
    const name = 'EVM'
    const id = 'evm'
    const { networks } = useSettingsState()
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
        walletConnectConnectors,
        addWalletConnectWallet,
        loadWalletConnectWallets,
        walletConnectWalletsLoaded,
        loadMoreWalletConnectWallets,
        searchWalletConnectWallets,
        hasMoreWalletConnectWallets,
        isLoadingMoreWalletConnectWallets,
    } = useEvmConnectors()

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectWalletsLoaded) {
            loadWalletConnectWallets().catch((error) => console.warn('Failed to load WalletConnect wallets registry', error))
        }
    }, [isWalletModalOpen, walletConnectWalletsLoaded, loadWalletConnectWallets])

    const disconnectWallet = useCallback(async (connectorName: string) => {

        try {
            const connections = getConnections(config)
            const connector = connections.find(c => c.connector.name.toLowerCase() === connectorName.toLowerCase())?.connector
            await disconnectAsync({
                connector: connector
            })
        }
        catch (e) {
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

        const configuredConnectors = dedupePreferInjected(allConnectors.filter(filterConnectors))
            .map(w => {
                const walletConnectWallet = walletConnectConnectors.find(w2 => w2.name.toLowerCase().includes(w.name.toLowerCase()) || w2.id.toLowerCase() === w.id.toLowerCase())
                const isWalletConnectSupported = w.type === "walletConnect" || w.name === "WalletConnect"
                const type = ((w.type == 'injected' && w.id !== 'com.immutable.passport') || w.id === "metaMaskSDK" || isWalletConnectSupported) ? w.type : "other"
                return {
                    ...w,
                    order: resolveWalletConnectorIndex(w.id),
                    type: type,
                    isMobileSupported: isWalletConnectSupported,
                    installUrl: walletConnectWallet?.installUrl,
                    hasBrowserExtension: walletConnectWallet?.hasBrowserExtension,
                    extensionNotFound: walletConnectWallet?.hasBrowserExtension ? (type == 'walletConnect' && !isMobilePlatform) : false,
                    providerName: name
                }
            })

        const existingConnectorKeys = new Set(
            configuredConnectors.flatMap(connector => [connector.id.toLowerCase(), connector.name.toLowerCase()])
        )

        const featuredDynamicWallets: InternalConnector[] = walletConnectConnectors
            .filter(wallet => (
                featuredWalletsIds.includes(wallet.id.toLowerCase())
                || featuredWalletsIds.some(featuredId => wallet.name.toLowerCase().includes(featuredId))
            ))
            .filter(wallet => !existingConnectorKeys.has(wallet.id.toLowerCase()) && !existingConnectorKeys.has(wallet.name.toLowerCase()))
            .map(wallet => ({
                ...wallet,
                order: resolveWalletConnectorIndex(wallet.id),
                type: 'other',
                isMobileSupported: true,
                extensionNotFound: wallet.hasBrowserExtension ? !isMobilePlatform : false,
                providerName: name
            }))

        return [...configuredConnectors, ...featuredDynamicWallets]
    }, [allConnectors, walletConnectConnectors, isMobilePlatform])

    const connectWallet = useCallback(async (props: { connector: WalletModalConnector }) => {
        let unsubscribeDisplayUri: (() => void) | undefined
        let registryBase = undefined as ReturnType<typeof getRegistryEntry>
        try {
            const internalConnector = props?.connector;
            if (!internalConnector) return;
            let connector = availableFeaturedWalletsForConnect.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector
            let actualConnector = connector

            // Registry-sourced tiles carry a WC_REGISTRY_MARKER populated by evmConnectorsContext.
            // When present we route the connect through the shared hidden WC connector and derive
            // the mobile deep-link from the same buildDeepLink helper the Solana path uses.
            registryBase = getRegistryEntry(internalConnector) ?? getRegistryEntry(connector)

            if (registryBase) {
                // Ensure the registry has been loaded (normally the modal does this on open).
                if (walletConnectConnectors.length === 0) await loadWalletConnectWallets()

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

            const Icon = connector.icon || resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector) })
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
            let pendingMetadata: DynamicWalletMetadata | undefined
            if (registryBase) {
                pendingMetadata = {
                    name: registryBase.name,
                    icon: registryBase.icon || '',
                    id: registryBase.id,
                }
                setPendingDynamicWcMetadata(EVM_NS, pendingMetadata)
            }

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
            if (registryBase) clearPendingDynamicWcMetadata(EVM_NS)

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
            throw mapConnectError(e)
        } finally {
            unsubscribeDisplayUri?.()
            if (registryBase) clearPendingDynamicWcMetadata(EVM_NS)
        }
    }, [availableFeaturedWalletsForConnect, disconnectAsync, networks, asSourceSupportedNetworks, autofillSupportedNetworks, withdrawalSupportedNetworks, name, config, walletConnectConnectors, addWalletConnectWallet, allConnectors, connectAsync, loadWalletConnectWallets, isMobilePlatform, setSelectedConnector, disconnectWallet])

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

    const activeWallet = useMemo(() => resolvedConnectors.find(w => w.isActive), [resolvedConnectors])
    const providerIcon = useMemo(() => networks.find(n => ethereumNames.some(name => name === n.name))?.logo, [networks])

    const searchWallets = useCallback(async (query: string): Promise<InternalConnector[]> => {
        const results = await searchWalletConnectWallets(query)
        return results.map((w): RegistryAttachedConnector<InternalConnector> => ({
            id: w.id,
            name: w.name,
            icon: w.icon,
            type: 'walletConnect' as const,
            order: w.order,
            isMobileSupported: w.isMobileSupported,
            hasBrowserExtension: w.hasBrowserExtension,
            installUrl: w.installUrl,
            extensionNotFound: w.hasBrowserExtension ? !isMobilePlatform : false,
            providerName: name,
            [WC_REGISTRY_MARKER]: w,
        }))
    }, [searchWalletConnectWallets, isMobilePlatform, name])

    const provider = useMemo(() => {
        return {
            connectWallet,
            disconnectWallets,
            switchAccount,
            switchChain,
            isNotAvailableCondition,
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
            ready: allConnectors.length > 0,
            loadMoreWallets: loadMoreWalletConnectWallets,
            hasMoreWallets: hasMoreWalletConnectWallets,
            isLoadingMoreWallets: isLoadingMoreWalletConnectWallets,
            searchWallets,
        }
    }, [connectWallet, disconnectWallets, switchAccount, resolvedConnectors, availableFeaturedWalletsForConnect, walletConnectConnectors, autofillSupportedNetworks, withdrawalSupportedNetworks, asSourceSupportedNetworks, name, id, networks, allConnectors.length, loadMoreWalletConnectWallets, hasMoreWalletConnectWallets, isLoadingMoreWalletConnectWallets, searchWallets]);

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
        ? (getDynamicWalletMetadata(address) || getPendingDynamicWcMetadata(EVM_NS))
        : null

    // Use dynamic metadata if available, otherwise use connector info
    const walletName = dynamicMetadata?.name || connector.name
    const walletId = dynamicMetadata?.id || connector.id
    const walletIcon = dynamicMetadata?.icon || connector.icon

    const walletDisplayName = `${walletName} ${walletId === "com.immutable.passport" ? "" : " - EVM"}`

    const wallet: Wallet = {
        id: walletName,
        internalId: walletId,
        isActive: walletIsActive,
        address,
        addresses: addresses || [address],
        displayName: walletDisplayName,
        providerName,
        icon: resolveWalletConnectorIcon({ connector: evmConnectorNameResolver(connector), address, iconUrl: walletIcon }),
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
