import type {
    InternalConnector,
    NetworkWithTokens,
    RequestAdditionalConnectorsParams,
    RequestAdditionalConnectorsResult,
    Wallet,
    WalletModalConnector,
    WalletConnectionProvider,
} from '@layerswap/widget/types'
import { NetworkType } from '@layerswap/widget/types'
import {
    buildDeepLink,
    clearPendingDynamicWcMetadata,
    createRegistryConnector,
    getDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    getRegistryEntry,
    mapConnectError,
    resolveWalletConnectorIcon,
    setDynamicWcMetadata,
    setPendingMetadataForRegistry,
    subscribeDisplayUri,
    type WalletConnectWalletBase,
} from '@layerswap/widget/internal'
import { name as PROVIDER_NAME, id as PROVIDER_ID, solanaNames } from '../constants'
import { resolveSolanaWalletConnectorIcon } from '../utils'
import { SolanaWalletConnectAdapter } from '../connectors/SolanaWalletConnectAdapter'
import { svmAdapterManager } from './svmAdapterManager'
import { useSvmStore } from './svmStore'

const SOLANA_WC_ADAPTER_NAME = 'WalletConnect'
const SVM_NS = PROVIDER_ID

type RegistryRequestFn = (params?: RequestAdditionalConnectorsParams) => Promise<{
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}>

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
    addRecentConnector?: (wallet: WalletConnectWalletBase) => void
    requestRegistryConnectors?: RegistryRequestFn
    isMobilePlatform?: boolean
    registryConnectors?: readonly WalletConnectWalletBase[]
}

const networkSupport: Record<string, string[]> = {
    soon: ['okx wallet', 'tokenpocket', 'nightly'],
    eclipse: ['nightly', 'backpack'],
}

function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
    const result: string[] = []
    supportedNetworks.forEach((network) => {
        const lowerCaseName = network.split('_')[0].toLowerCase()
        if (lowerCaseName === 'solana') {
            result.push(network)
        } else if (networkSupport[lowerCaseName] && networkSupport[lowerCaseName].includes(connectorId?.toLowerCase())) {
            result.push(network)
        }
    })
    return result
}

export class SvmConnectionService {
    private _networks: NetworkWithTokens[] = []
    private _supported: string[] = []
    private _networksKey = ''
    private _deps: RuntimeDeps = {}

    setNetworks(networks: NetworkWithTokens[]): void {
        const key = networks.map(n => n.name).join('|')
        if (this._networksKey === key) return
        this._networks = networks
        this._supported = networks.filter(n => n.type === NetworkType.Solana).map(l => l.name)
        this._networksKey = key
    }

    configure(deps: RuntimeDeps): void {
        this._deps = { ...this._deps, ...deps }
    }

    getSupportedNetworks(): string[] {
        return this._supported
    }

    getProviderIcon(): string | undefined {
        return this._networks.find(n => solanaNames.some(name => name === n.name))?.logo
    }

    getNetworkIcon(): string | undefined {
        return this.getProviderIcon()
    }

    getAvailableConnectors(): InternalConnector[] {
        const wallets = useSvmStore.getState().wallets
        const installed: InternalConnector[] = []
        for (const wallet of wallets) {
            const isWcAdapter = wallet.name === SOLANA_WC_ADAPTER_NAME
            const isInstalled = wallet.readyState === 'Installed'
                || wallet.readyState === 'Loadable'
                || wallet.name === 'Coinbase Wallet'
            installed.push({
                name: wallet.name.trim(),
                id: wallet.name.trim(),
                icon: resolveSolanaWalletConnectorIcon({ connector: wallet.name, iconUrl: wallet.icon }),
                type: isInstalled ? 'injected' : 'other',
                installUrl: wallet.url,
                hasBrowserExtension: !isWcAdapter,
                extensionNotFound: isWcAdapter ? false : !isInstalled,
                isLoadable: wallet.readyState === 'Loadable' && wallet.name !== 'Coinbase Wallet',
                providerName: PROVIDER_NAME,
            })
        }
        return installed
    }

    getAdditionalConnectors(): InternalConnector[] {
        const installed = this.getAvailableConnectors()
        const seenIds = new Set(installed.map(c => c.id.toLowerCase()))
        const seenNames = new Set(installed.map(c => c.name.toLowerCase()))
        const registry: InternalConnector[] = []
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        for (const reg of this._deps.registryConnectors ?? []) {
            if (seenIds.has(reg.id.toLowerCase())) continue
            if (seenNames.has(reg.name.toLowerCase())) continue
            registry.push(createRegistryConnector(reg, isMobilePlatform, PROVIDER_NAME))
        }
        return registry
    }

    resolveConnectedWallet(): Wallet | undefined {
        const { wallets, activeWalletName, activeAddress } = useSvmStore.getState()
        if (!activeWalletName || !activeAddress) return undefined
        const snapshot = wallets.find(w => w.name === activeWalletName)
        if (!snapshot || !snapshot.connected) return undefined

        const isWalletConnect = snapshot.name === SOLANA_WC_ADAPTER_NAME
        const dynamicMeta = isWalletConnect
            ? (getDynamicWcMetadata(SVM_NS, activeAddress) || getPendingDynamicWcMetadata(SVM_NS))
            : null

        const displayName = dynamicMeta?.name || snapshot.name
        const displayId = dynamicMeta?.id || snapshot.name
        const displayIconRaw = dynamicMeta?.icon || snapshot.icon

        const supported = resolveSupportedNetworks(this._supported, displayId)
        return {
            id: displayId,
            address: activeAddress,
            displayName: `${displayName} - Solana`,
            providerName: PROVIDER_NAME,
            icon: resolveSolanaWalletConnectorIcon({
                connector: snapshot.name,
                address: activeAddress,
                iconUrl: displayIconRaw,
            }),
            disconnect: () => this.disconnectWallet(),
            isActive: true,
            addresses: [activeAddress],
            asSourceSupportedNetworks: supported,
            autofillSupportedNetworks: supported,
            withdrawalSupportedNetworks: supported,
            networkIcon: this.getNetworkIcon(),
        }
    }

    getConnectedWallets(): Wallet[] {
        const wallet = this.resolveConnectedWallet()
        return wallet ? [wallet] : []
    }

    async disconnectWallet(): Promise<void> {
        try {
            await svmAdapterManager.disconnect()
        } catch (e) {
            // TODO: handle error
            console.log(e)
        }
    }

    async disconnectWallets(): Promise<void> {
        await this.disconnectWallet()
    }

    isNotAvailableCondition(
        connectorId: string | undefined,
        network: string | undefined,
        purpose?: 'withdrawal' | 'autofill' | 'asSource',
    ): boolean {
        if (!network) return false
        if (!connectorId) return true
        if (!purpose) {
            return resolveSupportedNetworks([network], connectorId).length === 0
        }
        const supported = resolveSupportedNetworks(this._supported, connectorId)
        return supported.length === 0 || !supported.includes(network)
    }

    warmUpWalletConnect(): void {
        try {
            const wcAdapter = svmAdapterManager.getAdapter(SOLANA_WC_ADAPTER_NAME) as unknown as SolanaWalletConnectAdapter | undefined
            wcAdapter?.warmup?.()
        } catch { /* ignore */ }
    }

    async connectWallet({ connector }: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        // `unsubscribeDisplayUri` is assigned only inside the WalletConnect
        // branch below (after every early throw) and is cleared in both the
        // inner `finally` around connect() and the outer `finally`, so no early
        // exit can leak the display-uri listener.
        let unsubscribeDisplayUri: (() => void) | undefined
        const registry = getRegistryEntry(connector)
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        const setSelectedConnector = this._deps.setSelectedConnector
        const addRecentConnector = this._deps.addRecentConnector

        try {
            const isRegistryWallet = !!registry
            const isBareWcTile = connector.name === SOLANA_WC_ADAPTER_NAME

            const installedAdapter = svmAdapterManager.getAdapter(connector.name)
                || svmAdapterManager.getAdapters().find(a => a.name.includes(connector.name))
            const walletConnectAdapter = svmAdapterManager.getAdapter(SOLANA_WC_ADAPTER_NAME)

            const useWalletConnect = isRegistryWallet || isBareWcTile
                || (connector.hasBrowserExtension && (connector.showQrCode || (isMobilePlatform && connector.extensionNotFound)))

            const targetAdapter = useWalletConnect ? walletConnectAdapter : installedAdapter
            if (!targetAdapter) throw new Error('Connector not found')

            if (useSvmStore.getState().activeAddress) {
                const activeAdapter = svmAdapterManager.getActiveAdapter()
                const adaptersToDisconnect = svmAdapterManager.getAdapters().filter(adapter =>
                    adapter !== targetAdapter && (adapter === activeAdapter || adapter.connected)
                )
                for (const adapter of adaptersToDisconnect) {
                    try { await adapter.disconnect() } catch { /* noop */ }
                }
            }

            const resolveURI = registry
                ? (uri: string) => buildDeepLink({ id: registry.id, mobile: registry.mobile }, uri)
                : undefined

            if (useWalletConnect && walletConnectAdapter) {
                const wcAdapter = walletConnectAdapter as unknown as SolanaWalletConnectAdapter

                setPendingMetadataForRegistry(SVM_NS, registry)

                const wantsQrModal = !isMobilePlatform || !resolveURI
                if (wantsQrModal) {
                    setSelectedConnector?.({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true })
                } else {
                    setSelectedConnector?.({ ...connector })
                }

                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wcAdapter,
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnector?.({ ...connector, qr, showQrCode: true }),
                })

                if (registry) addRecentConnector?.(registry)
            }

            try {
                svmAdapterManager.select(targetAdapter.name)
                await targetAdapter.connect()
            } finally {
                unsubscribeDisplayUri?.()
                unsubscribeDisplayUri = undefined
            }

            const connectedAdapter = targetAdapter.connected
                ? targetAdapter
                : svmAdapterManager.getAdapters().find(a => a.connected)
            const newAddress = connectedAdapter?.publicKey?.toBase58()

            if (newAddress && useWalletConnect && registry) {
                setDynamicWcMetadata(SVM_NS, newAddress, {
                    name: registry.name,
                    icon: registry.icon || '',
                    id: registry.id,
                })
            }

            const displayId = registry?.id || (connectedAdapter?.name ? String(connectedAdapter.name) : undefined)
            const displayName = registry?.name || connectedAdapter?.name
            const displayIconRaw = registry?.icon || connectedAdapter?.icon

            if (!newAddress || !connectedAdapter || !displayId) return undefined

            const supported = resolveSupportedNetworks(this._supported, displayId)
            const wallet: Wallet = {
                id: displayId,
                address: newAddress,
                displayName: `${displayName} - Solana`,
                providerName: PROVIDER_NAME,
                icon: resolveWalletConnectorIcon({ connector: displayId, address: newAddress, iconUrl: displayIconRaw }),
                disconnect: () => this.disconnectWallet(),
                isActive: true,
                addresses: [newAddress],
                asSourceSupportedNetworks: supported,
                autofillSupportedNetworks: supported,
                withdrawalSupportedNetworks: supported,
                networkIcon: this.getNetworkIcon(),
            }
            return wallet
        } catch (e) {
            throw mapConnectError(e)
        } finally {
            unsubscribeDisplayUri?.()
            if (registry) clearPendingDynamicWcMetadata(SVM_NS)
        }
    }

    async requestAdditionalConnectors(params: RequestAdditionalConnectorsParams = {}): Promise<RequestAdditionalConnectorsResult> {
        const fn = this._deps.requestRegistryConnectors
        if (!fn) {
            return { connectors: [], nextPage: null, totalCount: 0 }
        }
        const result = await fn(params)
        const installed = this.getAvailableConnectors()
        const installedConnectorIds = new Set(installed.map(c => c.id.toLowerCase()))
        const installedConnectorNames = new Set(installed.map(c => c.name.toLowerCase()))
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        return {
            connectors: result.connectors
                .filter(c => !installedConnectorIds.has(c.id.toLowerCase()) && !installedConnectorNames.has(c.name.toLowerCase()))
                .map(c => createRegistryConnector(c, isMobilePlatform, PROVIDER_NAME)),
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }

    buildProvider(): WalletConnectionProvider {
        const connectedWallets = this.getConnectedWallets()
        const activeWallet = connectedWallets[0]
        return {
            connectedWallets,
            activeWallet,
            connectWallet: this.connectWallet.bind(this),
            disconnectWallets: this.disconnectWallets.bind(this),

            isNotAvailableCondition: this.isNotAvailableCondition.bind(this),
            availableConnectors: this.getAvailableConnectors(),
            additionalConnectors: this.getAdditionalConnectors(),
            withdrawalSupportedNetworks: this._supported,
            autofillSupportedNetworks: this._supported,
            asSourceSupportedNetworks: this._supported,
            name: PROVIDER_NAME,
            id: PROVIDER_ID,
            providerIcon: this.getProviderIcon(),
            ready: useSvmStore.getState().ready,
            requestAdditionalConnectors: this.requestAdditionalConnectors.bind(this),
        }
    }
}

export const svmConnectionService = new SvmConnectionService()
