import { NetworkType, type InternalConnector, type Wallet } from '@layerswap/widget-types'
import type {
    RequestAdditionalConnectorsParams,
    RequestAdditionalConnectorsResult,
    WalletConnectionProvider,
    WalletConnectionService,
    WalletModalConnector,
} from '@layerswap/wallet-core/types'
import {
    buildDeepLink,
    clearPendingDynamicWcMetadata,
    createRegistryConnector,
    getDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    isWalletConnectRegistryConnector,
    setDynamicWcMetadata,
    setPendingMetadataForRegistry,
    subscribeDisplayUri,
    walletIconResolver,
    type AppNetworkAdapter,
    type WalletConnectWalletBase,
} from '@layerswap/wallet-core'
import { id as PROVIDER_ID, name as PROVIDER_NAME } from '../constants'
import { stellarKitManager } from './stellarKitManager'
import { stellarStore, type StellarWalletSnapshot } from './stellarStore'
import { toStellarConnector } from './stellarConnector'

type RegistryRequestFn = (params?: RequestAdditionalConnectorsParams) => Promise<{
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}>

type RuntimeDeps = {
    setSelectedConnector?: (connector: WalletModalConnector) => void
    getSelectedConnector?: () => WalletModalConnector | undefined
    addRecentConnector?: (connector: InternalConnector) => void
    requestRegistryConnectors?: RegistryRequestFn
    registryConnectors?: readonly WalletConnectWalletBase[]
    recentConnectors?: readonly InternalConnector[]
    isMobilePlatform?: boolean
}

type StellarKitConnectionManager = Pick<
    typeof stellarKitManager,
    'connect' | 'disconnect' | 'onDisplayUri' | 'setWalletConnectPresentation'
>

export class StellarConnectionService<Network> implements WalletConnectionService<RuntimeDeps, Network> {
    private networks: Network[] = []
    private networkAdapter: AppNetworkAdapter<Network> | undefined
    private networksKey = ''
    private deps: RuntimeDeps = {}

    constructor(private readonly kitManager: StellarKitConnectionManager = stellarKitManager) {}

    setNetworks(networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
        const key = networks.map(network => networkAdapter.getId(network)).join('|')
        if (this.networksKey === key) return
        this.networks = networks
        this.networkAdapter = networkAdapter
        this.networksKey = key
    }

    configure(deps: RuntimeDeps): void {
        this.deps = { ...this.deps, ...deps }
    }

    getAvailableConnectors(): InternalConnector[] {
        const isMobilePlatform = this.deps.isMobilePlatform ?? false
        const configured = stellarStore.getState().wallets
            .map(toStellarConnector)
            .filter(connector => !isMobilePlatform || connector.isMobileSupported)
        const recent = (this.deps.recentConnectors ?? [])
            .filter(connector => !isMobilePlatform || connector.isMobileSupported)
        return [...configured, ...recent]
    }

    getAdditionalConnectors(): InternalConnector[] {
        const isMobilePlatform = this.deps.isMobilePlatform ?? false
        return (this.deps.registryConnectors ?? [])
            .filter(wallet => !isMobilePlatform || wallet.isMobileSupported)
            .map(wallet => createRegistryConnector(wallet, isMobilePlatform, PROVIDER_NAME))
    }

    getConnectedWallets(): Wallet[] {
        const { wallets, activeWalletId, activeAddress } = stellarStore.getState()
        if (!activeWalletId || !activeAddress) return []
        const snapshot = wallets.find(wallet => wallet.id === activeWalletId)
        if (!snapshot) return []
        return [this.resolveWallet(snapshot, activeAddress)]
    }

    async connectWallet({ connector }: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        const wallets = stellarStore.getState().wallets
        const registryConnector = isWalletConnectRegistryConnector(connector) ? connector : undefined
        const wallet = registryConnector
            ? wallets.find(item => item.type === 'BRIDGE_WALLET')
            : wallets.find(item => item.id === connector.id)
        if (!wallet) throw new Error('Stellar wallet connector not found')

        const isWalletConnect = wallet.type === 'BRIDGE_WALLET'
        const isMobilePlatform = this.deps.isMobilePlatform ?? false
        const mobile = registryConnector?.mobile
        const deepLink = mobile?.native || mobile?.universal || undefined
        const resolveURI = registryConnector && mobile && deepLink
            ? (uri: string) => buildDeepLink({ id: registryConnector.id, mobile }, uri)
            : undefined
        const useAppKit = isWalletConnect && isMobilePlatform && !registryConnector
        let unsubscribeDisplayUri: (() => void) | undefined

        const setSelectedConnectorIfCurrent = (next: WalletModalConnector) => {
            if (!this.deps.getSelectedConnector) {
                this.deps.setSelectedConnector?.(next)
                return
            }
            const current = this.deps.getSelectedConnector()
            if (current?.id === connector.id) this.deps.setSelectedConnector?.(next)
        }

        try {
            if (isWalletConnect) {
                this.kitManager.setWalletConnectPresentation(useAppKit ? 'appkit' : 'layerswap')
                setPendingMetadataForRegistry(
                    PROVIDER_ID,
                    registryConnector ? { ...registryConnector, deepLink } : undefined,
                )
                const wantsQrModal = !useAppKit && (!isMobilePlatform || !resolveURI)
                if (wantsQrModal) {
                    setSelectedConnectorIfCurrent({
                        ...connector,
                        qr: { state: 'loading', value: undefined },
                        showQrCode: true,
                    })
                }
                if (!useAppKit) {
                    unsubscribeDisplayUri = subscribeDisplayUri({
                        source: this.kitManager,
                        resolveURI,
                        isMobilePlatform,
                        onQr: qr => setSelectedConnectorIfCurrent({ ...connector, qr, showQrCode: true }),
                    })
                }
                if (registryConnector) this.deps.addRecentConnector?.(registryConnector)
            }

            const { address } = await this.kitManager.connect(wallet.id)
            if (registryConnector) {
                setDynamicWcMetadata(PROVIDER_ID, address, {
                    name: registryConnector.name,
                    icon: registryConnector.icon || '',
                    id: registryConnector.id,
                    deepLink,
                })
            }
            return this.resolveWallet(wallet, address)
        } finally {
            unsubscribeDisplayUri?.()
            if (isWalletConnect) clearPendingDynamicWcMetadata(PROVIDER_ID)
        }
    }

    async disconnectWallets(): Promise<void> {
        await this.kitManager.disconnect()
    }

    async requestAdditionalConnectors(
        params: RequestAdditionalConnectorsParams = {},
    ): Promise<RequestAdditionalConnectorsResult> {
        if (!this.deps.requestRegistryConnectors || !this.hasWalletConnectTransport()) {
            return { connectors: [], nextPage: null, totalCount: 0 }
        }
        const result = await this.deps.requestRegistryConnectors(params)
        const isMobilePlatform = this.deps.isMobilePlatform ?? false
        const connectors = result.connectors
            .filter(wallet => !isMobilePlatform || wallet.isMobileSupported)
            .map(wallet => createRegistryConnector(wallet, isMobilePlatform, PROVIDER_NAME))
        return {
            connectors,
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        const activeWallet = connectedWallets[0]
        const supportedNetworks = this.getSupportedNetworks()
        const networkLogo = this.getNetworkLogo()
        return {
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),
            requestAdditionalConnectors: this.hasWalletConnectTransport()
                ? this.requestAdditionalConnectors.bind(this)
                : undefined,
            availableConnectors: this.getAvailableConnectors(),
            additionalConnectors: this.hasWalletConnectTransport()
                ? this.getAdditionalConnectors()
                : undefined,
            connectedWallets,
            activeWallet,
            autofillSupportedNetworks: supportedNetworks,
            withdrawalSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            capabilities: this.hasWalletConnectTransport() ? {
                walletConnectRegistry: {
                    networkTypes: [NetworkType.Stellar],
                },
            } : undefined,
            providerIcon: networkLogo,
            ready: stellarStore.getState().ready,
        }
    }

    private resolveWallet(snapshot: StellarWalletSnapshot, address: string): Wallet {
        const supportedNetworks = this.getSupportedNetworks()
        const isWalletConnect = snapshot.type === 'BRIDGE_WALLET'
        const dynamicMetadata = isWalletConnect
            ? getDynamicWcMetadata(PROVIDER_ID, address) || getPendingDynamicWcMetadata(PROVIDER_ID)
            : null
        const displayName = dynamicMetadata?.name || snapshot.name
        const walletId = dynamicMetadata?.id || snapshot.id
        const icon = dynamicMetadata?.icon || snapshot.icon
        return {
            id: walletId,
            address,
            addresses: [address],
            displayName: `${displayName} - Stellar`,
            providerName: PROVIDER_NAME,
            isActive: true,
            icon: walletIconResolver(address, icon),
            networkIcon: this.getNetworkLogo(),
            disconnect: () => this.disconnectWallets(),
            autofillSupportedNetworks: supportedNetworks,
            withdrawalSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
            metadata: { deepLink: dynamicMetadata?.deepLink },
        }
    }

    private hasWalletConnectTransport(): boolean {
        return stellarStore.getState().wallets.some(wallet => wallet.type === 'BRIDGE_WALLET')
    }

    private getNetworkLogo(): string | undefined {
        const network = this.networks.find(item => this.networkAdapter?.isStellarNetwork(item))
        return network && this.networkAdapter ? this.networkAdapter.getIcon(network) : undefined
    }

    private getSupportedNetworks(): string[] {
        if (!this.networkAdapter) return []
        return this.networks
            .filter(network => this.networkAdapter?.isStellarNetwork(network))
            .map(network => this.networkAdapter!.getId(network))
    }
}
