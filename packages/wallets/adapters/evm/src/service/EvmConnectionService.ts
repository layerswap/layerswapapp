import { type InternalConnector, type Wallet } from '@layerswap/widget-types';
import type { EnsureWalletChainOptions, RequestAdditionalConnectorsParams, RequestAdditionalConnectorsResult, WalletConnectionService } from "@layerswap/wallet-core/types";
import type { WalletModalConnector } from "@layerswap/wallet-core/types"
import type { Connector } from 'wagmi'
import { connect, disconnect, getConnections, switchAccount as wagmiSwitchAccount, type Connection, } from '@wagmi/core'
import { buildDeepLink, clearPendingDynamicWcMetadata, isWalletConnectRegistryConnector, mapConnectError, setDynamicWcMetadata, setPendingMetadataForRegistry, subscribeDisplayUri, type AppNetworkAdapter, type WalletConnectWalletBase } from "@layerswap/wallet-core"
import { evmConnectorNameResolver, resolveEVMWalletConnectorIcon } from '../evmUtils'
import { EIP155_NAMESPACE, name as PROVIDER_NAME, HIDDEN_WALLETCONNECT_ID } from '../constants'
import type { LSConnector } from '../connectors/types'
import { getEvmConfig } from './getEvmConfig'
import { ensureEvmChain, type ChainProvider } from './ensureEvmChain'
import { confirmConnectorChain } from './confirmConnectorChain'
import { computeEvmNetworkBuckets, type EvmAdditionalSupportedNetworks, type EvmNetworkBuckets } from './networkBuckets'
import { resolveSupportedNetworks } from './resolveSupportedNetworks'
import { resolveWallet } from './resolveWallet'
import { resolveWalletConnector } from './resolveWalletConnector'
import { attemptGetAccount, computeConfiguredConnectors, splitRegistryConnectors, supportsRegistryConnects, wagmiDisplayUriSource, } from './connectorsHelpers'
import { useEvmStore } from './evmStore'

type ActiveConnection = { id: string; address: string }

type RegistryRequestFn = (params?: RequestAdditionalConnectorsParams) => Promise<{
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}>

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
    addRecentConnector?: (connector: InternalConnector) => void
    requestRegistryConnectors?: RegistryRequestFn
    registryConnectors?: readonly WalletConnectWalletBase[]
    recentConnectors?: readonly InternalConnector[]
    isMobilePlatform?: boolean
    ethereumChainIds?: readonly number[]
    connectorFilter?: (connector: { id: string }) => boolean
}

export class EvmConnectionService<Network> implements WalletConnectionService<RuntimeDeps, Network> {
    private _networks: Network[] = []
    private _networkAdapter: AppNetworkAdapter<Network> | undefined
    private _buckets: EvmNetworkBuckets = { asSource: [], withdrawal: [], autofill: [] }
    private _networksKey = ''
    private _deps: RuntimeDeps = {}

    setNetworks(
        networks: Network[],
        networkAdapter: AppNetworkAdapter<Network>,
        additionalSupportedNetworks?: EvmAdditionalSupportedNetworks,
    ): void {
        const key = networks.map(network => networkAdapter.getId(network)).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._networkAdapter = networkAdapter
        this._buckets = computeEvmNetworkBuckets(networks, networkAdapter, additionalSupportedNetworks)
        this._networksKey = key
    }

    configure(deps: RuntimeDeps): void {
        this._deps = { ...this._deps, ...deps }
    }

    private isConnectorAllowed(connector: { id: string }): boolean {
        return this._deps.connectorFilter?.(connector) ?? true
    }

    getNetworks(): Network[] {
        return this._networks
    }

    getBuckets(): EvmNetworkBuckets {
        return this._buckets
    }

    getReady(allConnectors: readonly Connector[]): boolean {
        return allConnectors.length > 0
    }

    getConfiguredConnectors(allConnectors: readonly Connector[]): InternalConnector[] {
        return computeConfiguredConnectors({
            allConnectors: allConnectors.filter(connector => this.isConnectorAllowed(connector)),
            walletConnectConnectors: this._deps.registryConnectors ?? [],
            isMobilePlatform: this._deps.isMobilePlatform ?? false,
        })
    }

    getSplitRegistryConnectors(allConnectors: readonly Connector[]): { featured: InternalConnector[]; additional: InternalConnector[] } {
        // Without the hidden WalletConnect connector (e.g. host-supplied wagmi
        // config), registry wallets cannot connect — offer none.
        if (!supportsRegistryConnects(allConnectors)) {
            return { featured: [], additional: [] }
        }
        return splitRegistryConnectors(
            [...(this._deps.registryConnectors ?? [])],
            this._deps.isMobilePlatform ?? false,
            PROVIDER_NAME,
        )
    }

    getAvailableConnectors(allConnectors: readonly Connector[]): InternalConnector[] {
        const configured = this.getConfiguredConnectors(allConnectors)
        const supportsRegistry = supportsRegistryConnects(allConnectors)
        const { featured } = this.getSplitRegistryConnectors(allConnectors)
        const recent = supportsRegistry ? (this._deps.recentConnectors ?? []) : []
        return [...configured, ...featured, ...recent].filter(connector => this.isConnectorAllowed(connector))
    }

    getAdditionalConnectors(allConnectors: readonly Connector[]): InternalConnector[] {
        return this.getSplitRegistryConnectors(allConnectors).additional.filter(connector => this.isConnectorAllowed(connector))
    }

    getConnectedWallets(
        connections: readonly Connection[],
        activeConnection: ActiveConnection | undefined,
    ): Wallet[] {
        const disconnectFn = this.disconnectWallet.bind(this)
        return connections
            .filter(connection => this.isConnectorAllowed(connection.connector))
            .map(connection => resolveWallet({
                activeConnection,
                connection,
                disconnect: disconnectFn,
                networks: this._networks,
                networkAdapter: this._networkAdapter!,
                ethereumChainIds: this._deps.ethereumChainIds,
                supportedNetworks: this._buckets,
                providerName: PROVIDER_NAME,
            }))
            .filter((w): w is Wallet => w !== undefined)
    }

    getActiveWallet(wallets: readonly Wallet[]): Wallet | undefined {
        return wallets.find(w => w.isActive)
    }

    isNotAvailable(
        connectorId: string | undefined,
        network: string | undefined,
        purpose?: 'withdrawal' | 'autofill' | 'asSource',
    ): boolean {
        if (!network) return false
        if (!connectorId) return true
        if (!this.isConnectorAllowed({ id: connectorId })) return true

        if (!purpose) {
            return resolveSupportedNetworks([network], connectorId).length === 0
        }

        const pool = purpose === 'withdrawal' ? this._buckets.withdrawal
            : purpose === 'autofill' ? this._buckets.autofill
                : this._buckets.asSource

        const supported = resolveSupportedNetworks(pool, connectorId)
        return supported.length === 0 || !supported.includes(network)
    }

    async disconnectWallet(connectorName: string): Promise<void> {
        try {
            const config = getEvmConfig()
            const connections = getConnections(config)
            const connector = connections.find(c => this.isConnectorAllowed(c.connector) && c.connector.name.toLowerCase() === connectorName.toLowerCase())?.connector
            if (!connector) return
            await disconnect(config, { connector })
        } catch (e) {
            // Disconnect is best-effort — log but do not rethrow.
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[EVM] Failed to disconnect ${connectorName}: ${msg}`)
        }
    }

    async disconnectWallets(): Promise<void> {
        try {
            const config = getEvmConfig()
            const connections = getConnections(config)
            await Promise.all(connections.filter(c => this.isConnectorAllowed(c.connector)).map(c => this.disconnectWallet(c.connector.name)))
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[EVM] Failed to disconnect wallets: ${msg}`)
        }
    }

    async requestAdditionalConnectors(params: RequestAdditionalConnectorsParams = {}): Promise<RequestAdditionalConnectorsResult> {
        const fn = this._deps.requestRegistryConnectors
        const allConnectors = useEvmStore.getState().allConnectors
        if (!fn || !supportsRegistryConnects(allConnectors)) {
            return { connectors: [], nextPage: null, totalCount: 0 }
        }
        const result = await fn(params)
        const { featured, additional } = splitRegistryConnectors(
            result.connectors,
            this._deps.isMobilePlatform ?? false,
            PROVIDER_NAME,
        )
        const connectors = params.query?.trim() ? [...featured, ...additional] : additional
        return {
            connectors: connectors.filter(connector => this.isConnectorAllowed(connector)),
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }

    private resolveWalletConnector(wallet: Wallet): Connector | undefined {
        return resolveWalletConnector(getEvmConfig(), wallet)
    }

    async switchAccount(wallet: Wallet, address: string): Promise<void> {
        const connector = this.resolveWalletConnector(wallet)
        if (!connector) throw new Error('Connector not found')
        const config = getEvmConfig()
        const { accounts } = await wagmiSwitchAccount(config, { connector })
        const account = accounts.find(a => a.toLowerCase() === address.toLowerCase())
        if (!account) throw new Error('Account not found')
        useEvmStore.getState().setActiveAddress(account)
    }

    async switchChain(wallet: Wallet, chainId: string | number): Promise<void> {
        await this.ensureChain(wallet, chainId)
    }

    async ensureChain(wallet: Wallet, chainId: string | number, options: EnsureWalletChainOptions = {}): Promise<void> {
        options.signal?.throwIfAborted()
        const config = getEvmConfig()
        const connector = resolveWalletConnector(config, wallet)
        const chain = config.chains.find(c => c.id === Number(chainId))
        if (!chain) throw new Error(`Chain ${chainId} is not configured`)

        // Use the selected provider's EIP-1193 protocol for every connector. This
        // also uses the current chain registry for host-supplied wagmi configs,
        // rather than a connector's initialization-time snapshot or SDK retry loop.
        await ensureEvmChain({
            ...options,
            chain,
            account: wallet.address,
            getProvider: () => connector.getProvider() as Promise<ChainProvider | undefined>,
            assertConnected: () => {
                if (resolveWalletConnector(config, wallet).uid !== connector.uid) {
                    throw Object.assign(new Error('Selected wallet changed. Please try again.'), { reasonCode: 'wallet_disconnected' })
                }
            },
            onReady: () => confirmConnectorChain(connector, chain.id),
        })
    }

    async connectWallet(props: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        const config = getEvmConfig()
        const allConnectors = useEvmStore.getState().allConnectors
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        const setSelectedConnector = this._deps.setSelectedConnector
        const addRecentConnector = this._deps.addRecentConnector
        const availableConnectors = this.getAvailableConnectors(allConnectors)

        let unsubscribeDisplayUri: (() => void) | undefined
        const internalConnector = props?.connector
        const isRegistry = isWalletConnectRegistryConnector(internalConnector)

        try {
            if (!internalConnector) return
            if (!this.isConnectorAllowed(internalConnector)) {
                throw new Error('This login wallet cannot be used as a funding wallet. Please choose another wallet.')
            }
            let connector = availableConnectors.find(w => w.id === internalConnector.id) as InternalConnector & LSConnector
            let actualConnector = connector

            if (isRegistry) {
                addRecentConnector?.(internalConnector)

                const wcConnector = allConnectors.find(c => c.id === HIDDEN_WALLETCONNECT_ID)
                if (!wcConnector) {
                    throw new Error(
                        'Registry wallet connects require the hidden WalletConnect connector, '
                        + 'which is missing from the wagmi config. Hosts supplying an external '
                        + 'wagmiConfig must include createHiddenWalletConnectConnector() to '
                        + 'enable registry wallets.',
                    )
                }
                actualConnector = wcConnector as unknown as InternalConnector & LSConnector

                const resolveURI = (uri: string) => buildDeepLink({ id: internalConnector.id, mobile: internalConnector.mobile! }, uri)
                connector = Object.assign({}, wcConnector, {
                    id: internalConnector.id,
                    name: internalConnector.name,
                    icon: internalConnector.icon,
                    // Keep the registry identity so a retry from the QR/error
                    // screen re-enters this branch instead of failing lookup.
                    type: 'walletConnect',
                    source: 'registry',
                    mobile: internalConnector.mobile,
                    isMobileSupported: true,
                    resolveURI,
                    providerName: PROVIDER_NAME,
                }) as unknown as InternalConnector & LSConnector
            } else if (!connector || typeof (connector as LSConnector).disconnect !== 'function') {
                throw new Error('Connector not found')
            }

            if (!this.isConnectorAllowed(actualConnector)) {
                throw new Error('This login wallet cannot be used as a funding wallet. Please choose another wallet.')
            }

            const iconString = (typeof connector.icon === 'string' ? connector.icon : undefined)
                || resolveEVMWalletConnectorIcon({ connector: evmConnectorNameResolver(connector as unknown as Connector) })
            setSelectedConnector?.({ ...connector, icon: iconString })

            if (actualConnector.id !== 'coinbaseWalletSDK' && typeof (actualConnector as LSConnector).disconnect === 'function') {
                await (actualConnector as LSConnector).disconnect!()
                await disconnect(config, { connector: actualConnector as unknown as Connector })
            }

            const resolveURI = (connector as LSConnector).resolveURI as ((uri: string) => string | undefined) | undefined
            const showQrCode = (internalConnector as WalletModalConnector).showQrCode
            const wantsMobileRedirect = isMobilePlatform && connector.id !== 'walletConnect' && !!resolveURI
            const wantsQrModal = !isMobilePlatform
                && connector.type !== 'injected'
                && !!connector.isMobileSupported
                && connector.id !== 'coinbaseWalletSDK'
                && connector.id !== 'metaMaskSDK'

            if (wantsQrModal) {
                setSelectedConnector?.(prev => (prev && prev.id === connector.id)
                    ? { ...connector, icon: iconString, qr: { state: 'loading', value: undefined }, showQrCode }
                    : prev)
            }

            if (wantsMobileRedirect || wantsQrModal) {
                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wagmiDisplayUriSource(actualConnector as unknown as Connector),
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnector?.(prev => (prev && prev.id === connector.id)
                        ? { ...connector, icon: iconString, qr, showQrCode }
                        : prev),
                })
            }

            // Always prime pending metadata for registry-sourced connects so the
            // `connectedWallets` re-render that happens between connect start and
            // address resolution can render the right wallet name/icon.
            const pendingMetadata = setPendingMetadataForRegistry(EIP155_NAMESPACE, isRegistry ? internalConnector : undefined)

            try {
                await connect(config, { connector: actualConnector as unknown as Connector })
            } finally {
                unsubscribeDisplayUri?.()
                unsubscribeDisplayUri = undefined
            }

            const activeAccount = await attemptGetAccount(config)

            const connections = getConnections(config)
            let connection = connections.find(c => c.connector.uid === actualConnector.uid)

            if (!connection) {
                const accounts = await (actualConnector as unknown as Connector).getAccounts()
                if (!accounts?.length) {
                    throw new Error('No accounts returned from wallet')
                }
                const chainId = await (actualConnector as unknown as Connector).getChainId()
                connection = {
                    accounts: accounts as readonly [`0x${string}`, ...`0x${string}`[]],
                    chainId: Number(chainId),
                    connector: actualConnector as unknown as Connector,
                }
            }

            // Guard against a malicious/compromised connector reporting an active
            // address that is not actually one of its accounts — otherwise all
            // subsequent transactions would be attributed to a spoofed address.
            if (activeAccount.address) {
                if (connection.accounts.length === 0) {
                    throw new Error(
                        `Account validation failed: connector reported active address ${activeAccount.address} but returned no accounts. Reconnect your wallet.`,
                    )
                }
                const isValidAccount = connection.accounts.some(
                    a => a.toLowerCase() === activeAccount.address!.toLowerCase(),
                )
                if (!isValidAccount) {
                    throw new Error(
                        `Account validation failed: ${activeAccount.address} not in connector accounts. Reconnect your wallet.`,
                    )
                }
            }

            if (isRegistry && pendingMetadata) {
                for (const address of connection.accounts) {
                    setDynamicWcMetadata(EIP155_NAMESPACE, address, pendingMetadata)
                }
            }
            clearPendingDynamicWcMetadata(EIP155_NAMESPACE)

            const wallet = resolveWallet({
                activeConnection: (activeAccount.connector && activeAccount.address) ? {
                    id: activeAccount.connector.id,
                    address: activeAccount.address,
                } : undefined,
                connection,
                disconnect: this.disconnectWallet.bind(this),
                networks: this._networks,
                networkAdapter: this._networkAdapter!,
                ethereumChainIds: this._deps.ethereumChainIds,
                supportedNetworks: this._buckets,
                providerName: PROVIDER_NAME,
            })

            return wallet
        } catch (e) {
            throw mapConnectError(e)
        } finally {
            unsubscribeDisplayUri?.()
            if (isRegistry) clearPendingDynamicWcMetadata(EIP155_NAMESPACE)
        }
    }
}

export const evmConnectionService = new EvmConnectionService()
