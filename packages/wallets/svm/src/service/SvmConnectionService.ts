import type { NetworkWithTokens } from "@layerswap/utils"
import type { InternalConnector, RequestAdditionalConnectorsParams, RequestAdditionalConnectorsResult, Wallet, WalletConnectionProvider, WalletConnectionService } from "@layerswap/wallet-core/types"
import type { WalletModalConnector } from "@layerswap/wallet-core/types"
import { NetworkType } from "@layerswap/utils"
import { buildDeepLink, clearPendingDynamicWcMetadata, createRegistryConnector, getDynamicWcMetadata, getPendingDynamicWcMetadata, getRegistryEntry, mapConnectError, setDynamicWcMetadata, setPendingMetadataForRegistry, subscribeDisplayUri, walletKey, type WalletConnectWalletBase } from "@layerswap/wallet-core"
import { findRegistryWalletByName } from "@layerswap/wallet-core"
import { resolveWalletConnectorIcon } from "@layerswap/wallet-core"
import { name as PROVIDER_NAME, id as PROVIDER_ID, solanaNames } from '../constants'
import { resolveSolanaWalletConnectorIcon } from '../utils'
import { SolanaWalletConnectAdapter } from '../connectors/SolanaWalletConnectAdapter'
import { svmAdapterManager } from './svmAdapterManager'
import { useSvmStore } from './svmStore'

const SOLANA_WC_MODAL_NAME = 'WalletConnect'
const SOLANA_HIDDEN_WC_NAME = 'Hidden WalletConnect'
const SVM_NS = PROVIDER_ID

const normalizeWcName = (name?: string) => name === SOLANA_HIDDEN_WC_NAME ? SOLANA_WC_MODAL_NAME : name
type RegistryRequestFn = (params?: RequestAdditionalConnectorsParams) => Promise<{
    connectors: WalletConnectWalletBase[]
    nextPage: number | null
    totalCount: number
}>

type RuntimeDeps = {
    setSelectedConnector?: (connector: unknown) => void
    getSelectedConnector?: () => { id: string } | undefined
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

export class SvmConnectionService implements WalletConnectionService<RuntimeDeps> {
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
            const adapterName = wallet.name.trim()
            // The hidden adapter is the WC transport, never a user-facing tile.
            if (adapterName === SOLANA_HIDDEN_WC_NAME) continue
            const isWcAdapter = adapterName === SOLANA_WC_MODAL_NAME
            const isInstalled = wallet.readyState === 'Installed'
                || wallet.readyState === 'Loadable'
                || adapterName === 'Coinbase Wallet'
            installed.push({
                name: adapterName,
                id: adapterName,
                icon: resolveSolanaWalletConnectorIcon({ connector: adapterName, iconUrl: wallet.icon }),
                type: isInstalled ? 'injected' : 'other',
                installUrl: wallet.url,
                hasBrowserExtension: !isWcAdapter,
                extensionNotFound: isWcAdapter ? false : !isInstalled,
                isLoadable: wallet.readyState === 'Loadable' && adapterName !== 'Coinbase Wallet',
                providerName: PROVIDER_NAME,
            })
        }
        return installed
    }

    getAdditionalConnectors(): InternalConnector[] {
        const installed = this.getAvailableConnectors()
        const installedKeys = new Set(installed.map(c => walletKey(c.name)))
        const registry: InternalConnector[] = []
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        for (const reg of this._deps.registryConnectors ?? []) {
            if (installedKeys.has(walletKey(reg.name)) || installedKeys.has(walletKey(reg.id))) continue
            registry.push(createRegistryConnector(reg, isMobilePlatform, PROVIDER_NAME))
        }
        return registry
    }

    resolveConnectedWallet(): Wallet | undefined {
        const { wallets, activeWalletName, activeAddress } = useSvmStore.getState()
        if (!activeWalletName || !activeAddress) return undefined
        const snapshot = wallets.find(w => w.name === activeWalletName)
        if (!snapshot || !snapshot.connected) return undefined

        const isWalletConnect = snapshot.name === SOLANA_WC_MODAL_NAME || snapshot.name === SOLANA_HIDDEN_WC_NAME
        const dynamicMeta = isWalletConnect
            ? (getDynamicWcMetadata(SVM_NS, activeAddress) || getPendingDynamicWcMetadata(SVM_NS))
            : null

        const normalizedName = normalizeWcName(snapshot.name) || snapshot.name
        const displayName = dynamicMeta?.name || normalizedName
        const displayId = dynamicMeta?.id || normalizedName
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
            // Disconnect is best-effort — log but do not rethrow.
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`[SVM] Failed to disconnect wallet: ${msg}`)
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
            const wcAdapter = svmAdapterManager.getAdapter(SOLANA_WC_MODAL_NAME) as unknown as SolanaWalletConnectAdapter | undefined
            wcAdapter?.warmup?.()
        } catch { /* ignore */ }
    }

    async connectWallet({ connector }: { connector: WalletModalConnector }): Promise<Wallet | undefined> {
        // `unsubscribeDisplayUri` is assigned only inside the WalletConnect
        // branch below (after every early throw) and is cleared in both the
        // inner `finally` around connect() and the outer `finally`, so no early
        // exit can leak the display-uri listener.
        let unsubscribeDisplayUri: (() => void) | undefined
        let registry: WalletConnectWalletBase | undefined
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        const setSelectedConnector = this._deps.setSelectedConnector
        const getSelectedConnector = this._deps.getSelectedConnector
        const addRecentConnector = this._deps.addRecentConnector
        const requestRegistryConnectors = this._deps.requestRegistryConnectors

        // Only mutate the selected connector while it is still THIS connector — a
        // stale async QR callback must not clobber a connector the user switched
        // to (or a modal they closed) mid-connect. Falls back to an unconditional
        // set when no reader is wired so the QR still renders.
        const setSelectedConnectorIfCurrent = (next: unknown) => {
            if (!getSelectedConnector) { setSelectedConnector?.(next); return }
            const current = getSelectedConnector()
            if (current && current.id === connector.id) setSelectedConnector?.(next)
        }

        const prevSelectedName = svmAdapterManager.getSelectedName()
        try {
            const isBareWcTile = connector.name === SOLANA_WC_MODAL_NAME

            // Match the installed adapter by canonical wallet key so spellings
            // like "Trust" vs "Trust Wallet" collapse to the same adapter.
            const installedAdapter = svmAdapterManager.getAdapters()
                .find(a => walletKey(a.name) === walletKey(connector.name))
            // The visible "WalletConnect" tile is only an entry point; the real
            // WC transport is the hidden adapter that performs the connect.
            const hiddenWcAdapter = svmAdapterManager.getAdapter(SOLANA_HIDDEN_WC_NAME)

            // The registry entry carries the mobile deeplink. An installed wallet
            // on mobile still needs its registry entry resolved on demand so we
            // can deeplink into its app instead of rendering a desktop QR.
            let matchedRegistry = getRegistryEntry(connector)
            if (!matchedRegistry && isMobilePlatform && installedAdapter && !isBareWcTile && requestRegistryConnectors) {
                matchedRegistry = await findRegistryWalletByName(requestRegistryConnectors, connector.name)
            }

            const useWalletConnect = isBareWcTile
                ? !isMobilePlatform
                : (
                    (!!matchedRegistry && (isMobilePlatform || !installedAdapter))
                    || (connector.hasBrowserExtension && (connector.showQrCode || (isMobilePlatform && connector.extensionNotFound)))
                )

            registry = useWalletConnect ? matchedRegistry : undefined

            const targetAdapter = useWalletConnect ? hiddenWcAdapter : installedAdapter
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

            const deeplinkRegistry = registry
            const resolveURI = deeplinkRegistry
                ? (uri: string) => buildDeepLink({ id: deeplinkRegistry.id, mobile: deeplinkRegistry.mobile }, uri)
                : undefined

            if (useWalletConnect && hiddenWcAdapter) {
                const wcAdapter = hiddenWcAdapter as unknown as SolanaWalletConnectAdapter

                setPendingMetadataForRegistry(SVM_NS, registry)

                const wantsQrModal = !isMobilePlatform || !resolveURI
                if (wantsQrModal) {
                    setSelectedConnectorIfCurrent({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true })
                } else {
                    setSelectedConnectorIfCurrent({ ...connector })
                }

                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wcAdapter,
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnectorIfCurrent({ ...connector, qr, showQrCode: true }),
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

            const resolvedAdapterName = normalizeWcName(connectedAdapter?.name)
            const displayId = registry?.id || (resolvedAdapterName ? String(resolvedAdapterName) : undefined)
            const displayName = registry?.name || resolvedAdapterName
            const displayIconRaw = registry?.icon || connectedAdapter?.icon

            if (!newAddress || !connectedAdapter || !displayId) return undefined

            const supported = resolveSupportedNetworks(this._supported, displayId)
            const wallet: Wallet = {
                id: displayId,
                address: newAddress,
                displayName: `${displayName} - Solana`,
                providerName: PROVIDER_NAME,
                icon: resolveWalletConnectorIcon({ address: newAddress, iconUrl: displayIconRaw }),
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
            svmAdapterManager.select(prevSelectedName)
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
        const installedKeys = new Set(installed.map(c => walletKey(c.name)))
        const isMobilePlatform = this._deps.isMobilePlatform ?? false
        return {
            connectors: result.connectors
                .filter(c => !installedKeys.has(walletKey(c.name)) && !installedKeys.has(walletKey(c.id)))
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
