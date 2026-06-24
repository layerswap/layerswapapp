import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { NetworkType } from "@/Models/Network"
import {
    InternalConnector,
    RequestAdditionalConnectorsParams,
    RequestAdditionalConnectorsResult,
    Wallet,
    WalletProvider,
} from "@/Models/WalletProvider"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useSettingsState } from "@/context/settings"
import { useConnectModal, WalletModalConnector } from "@/components/WalletModal"
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile"
import {
    getRegistryEntry,
    type WalletConnectWalletBase,
} from "@/lib/wallets/walletConnect/types"
import { walletKey } from "@/lib/wallets/utils/walletKey"
import { findRegistryWalletByName } from "@/lib/wallets/walletConnect/findRegistryWallet"
import { buildDeepLink } from "@/lib/wallets/walletConnect/buildDeepLink"
import { subscribeDisplayUri } from "@/lib/wallets/walletConnect/subscribeDisplayUri"
import { mapConnectError } from "@/lib/wallets/walletConnect/mapConnectError"
import {
    getDynamicWcMetadata,
    setDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    clearPendingDynamicWcMetadata,
    setPendingMetadataForRegistry,
} from "@/lib/wallets/walletConnect/dynamicMetadata"
import { SolanaWalletConnectAdapter } from "./SolanaWalletConnectAdapter"
import { useAdditionalConnectors } from "@/lib/wallets/walletConnect/useAdditionalConnectors"
import { createRegistryConnector } from "@/lib/wallets/walletConnect/createRegistryConnector"

const SOLANA_NS = 'solana'
const SOLANA_WC_MODAL_NAME = 'WalletConnect'
const SOLANA_HIDDEN_WC_NAME = 'Hidden WalletConnect'

const normalizeWcName = (name?: string) => name === SOLANA_HIDDEN_WC_NAME ? SOLANA_WC_MODAL_NAME : name

const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

export default function useSVM(): WalletProvider {
    const { networks } = useSettingsState()
    const isMobilePlatform = useMemo(() => isMobile(), [])

    const commonSupportedNetworks = useMemo(() => [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ], [networks])

    const name = 'Solana'
    const id = 'solana'
    const { disconnect, select, wallets } = useWallet()
    const walletsRef = useRef(wallets)
    walletsRef.current = wallets
    const connectedWallet = wallets.find(w => w.adapter.connected === true && !!w.adapter.publicKey)
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const {
        browseConnectors: walletConnectConnectors,
        browseMetadata: walletConnectBrowseMetadata,
        requestAdditionalConnectors: requestRegistryConnectors,
        addRecentConnector: addWalletConnectWallet,
    } = useAdditionalConnectors(SOLANA_NS)

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectBrowseMetadata.loaded) {
            requestRegistryConnectors({ page: 1, pageSize: 40 }).catch((error) => console.warn('Failed to load Solana WalletConnect wallets registry', error))
        }
    }, [isWalletModalOpen, walletConnectBrowseMetadata.loaded, requestRegistryConnectors])

    const connectedWallets = useMemo(() => {

        if (connectedWallet) {
            const isWalletConnect = connectedAdapterName === SOLANA_WC_MODAL_NAME || connectedAdapterName === SOLANA_HIDDEN_WC_NAME
            const dynamicMeta = (isWalletConnect && connectedAddress)
                ? (getDynamicWcMetadata(SOLANA_NS, connectedAddress) || getPendingDynamicWcMetadata(SOLANA_NS))
                : null

            const normalizedName = normalizeWcName(connectedAdapterName)
            const displayName = dynamicMeta?.name || normalizedName
            const displayIcon = dynamicMeta?.icon || connectedWallet?.adapter.icon
            const displayId = dynamicMeta?.id || (normalizedName ? String(normalizedName) : undefined)

            const wallet: Wallet | undefined = (connectedAddress && displayId) ? {
                id: displayId,
                address: connectedAddress,
                displayName: `${displayName} - Solana`,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: displayId, address: connectedAddress, iconUrl: displayIcon }),
                disconnect,
                isActive: true,
                addresses: [connectedAddress],
                asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
            } : undefined

            if (wallet) {
                return [wallet]
            }
        }

    }, [connectedAddress, connectedAdapterName, connectedWallet, disconnect, commonSupportedNetworks, networks])

    const connectWallet = useCallback(async ({ connector }: { connector: WalletModalConnector }) => {
        let unsubscribeDisplayUri: (() => void) | undefined
        let registry: WalletConnectWalletBase | undefined
        try {
            const isBareWcTile = connector.name === SOLANA_WC_MODAL_NAME
            const currentWallets = walletsRef.current
            const installedAdapter = currentWallets.find(w => walletKey(w.adapter.name) === walletKey(connector.name))
            const hiddenWcAdapter = currentWallets.find(w => w.adapter.name === SOLANA_HIDDEN_WC_NAME)

            let matchedRegistry = getRegistryEntry(connector)
            if (!matchedRegistry && isMobilePlatform && installedAdapter && !isBareWcTile) {
                matchedRegistry = await findRegistryWalletByName(requestRegistryConnectors, connector.name)
            }

            const useWalletConnect = isBareWcTile
                ? !isMobilePlatform
                : (
                    (!!matchedRegistry && (isMobilePlatform || !installedAdapter))
                    || (connector.hasBrowserExtension && (connector.showQrCode || (isMobilePlatform && connector.extensionNotFound)))
                )

            registry = useWalletConnect ? matchedRegistry : undefined

            const targetAdapterEntry = useWalletConnect ? hiddenWcAdapter : installedAdapter
            if (!targetAdapterEntry) throw new Error('Connector not found')

            if (connectedWallet) {
                try { await connectedWallet.adapter.disconnect() } catch { /* noop */ }
            }

            const deeplinkRegistry = registry
            const resolveURI = deeplinkRegistry
                ? (uri: string) => buildDeepLink({ id: deeplinkRegistry.id, mobile: deeplinkRegistry.mobile }, uri)
                : undefined

            if (useWalletConnect && hiddenWcAdapter) {
                const wcAdapter = hiddenWcAdapter.adapter as unknown as SolanaWalletConnectAdapter

                // Track display metadata so connectedWallets can render the right name/icon after success
                setPendingMetadataForRegistry(SOLANA_NS, registry)

                // Only pre-render the QR screen when we actually want the user to see it:
                // - Desktop → QR modal.
                // - Mobile WITHOUT a resolvable deeplink (e.g. bare WC tile) → QR fallback so
                //   the user isn't stuck on a spinner.
                // On mobile WITH a deeplink, leave `qr` unset so ConnectorsList renders the
                // neutral LoadingConnect screen; `subscribeDisplayUri` will then navigate via
                // `window.location.href = deepLink` as soon as the URI arrives.
                const wantsQrModal = !isMobilePlatform || !resolveURI

                if (wantsQrModal) {
                    setSelectedConnector(prev => (prev && prev.id === connector.id)
                        ? { ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true }
                        : prev)
                } else {
                    setSelectedConnector(prev => (prev && prev.id === connector.id)
                        ? { ...connector }
                        : prev)
                }

                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wcAdapter,
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnector(prev => (prev && prev.id === connector.id)
                        ? { ...connector, qr, showQrCode: true }
                        : prev),
                })

                // Track recent registry wallets so they can be re-surfaced
                if (registry) addWalletConnectWallet(registry)
            }

            try {
                select(targetAdapterEntry.adapter.name)
                await targetAdapterEntry.adapter.connect()
            } finally {
                unsubscribeDisplayUri?.()
                unsubscribeDisplayUri = undefined
            }

            // Prefer the adapter we just connected — `wallets.find(connected)` can
            // return a stale entry (e.g. a previously-connected Phantom that sits
            // earlier in the array) and yield the wrong address. Fall back to the
            // scan only if our target somehow isn't reporting connected.
            const newConnectedWallet = targetAdapterEntry.adapter.connected === true
                ? targetAdapterEntry
                : walletsRef.current.find(w => w.adapter.connected === true)
            const newAddress = newConnectedWallet?.adapter.publicKey?.toBase58()

            // Persist display metadata for reconnects after refresh
            if (newAddress && useWalletConnect && registry) {
                setDynamicWcMetadata(SOLANA_NS, newAddress, {
                    name: registry.name,
                    icon: registry.icon || '',
                    id: registry.id,
                })
            }

            const resolvedAdapterName = normalizeWcName(newConnectedWallet?.adapter.name)
            const displayId = registry?.id || (resolvedAdapterName ? String(resolvedAdapterName) : undefined)
            const displayName = registry?.name || resolvedAdapterName
            const displayIconRaw = registry?.icon || newConnectedWallet?.adapter.icon

            const wallet: Wallet | undefined = newAddress && newConnectedWallet && displayId ? {
                id: displayId,
                address: newAddress,
                displayName: `${displayName} - Solana`,
                providerName: name,
                icon: resolveWalletConnectorIcon({ connector: displayId, address: newAddress, iconUrl: displayIconRaw }),
                disconnect,
                isActive: true,
                addresses: [newAddress],
                asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, displayId),
                networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
            } : undefined

            return wallet
        } catch (e) {
            throw mapConnectError(e)
        } finally {
            unsubscribeDisplayUri?.()
            if (registry) clearPendingDynamicWcMetadata(SOLANA_NS)
        }
    }, [connectedWallet, disconnect, select, isMobilePlatform, setSelectedConnector, addWalletConnectWallet, commonSupportedNetworks, networks, name, requestRegistryConnectors])

    const disconnectWallet = useCallback(async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }, [disconnect])

    const { availableConnectors, additionalConnectors } = useMemo(() => {
        const installed: InternalConnector[] = []
        const registry: InternalConnector[] = []

        for (const wallet of wallets) {
            const adapterName = wallet.adapter.name.trim()
            if (adapterName === SOLANA_HIDDEN_WC_NAME) continue
            const isWcAdapter = adapterName === SOLANA_WC_MODAL_NAME
            const isInstalled = wallet.readyState === 'Installed' || wallet.readyState === 'Loadable' || adapterName === 'Coinbase Wallet'
            const internalConnector: InternalConnector = {
                name: adapterName,
                id: adapterName,
                icon: wallet.adapter.icon,
                type: isInstalled ? 'injected' : 'other',
                installUrl: wallet.adapter?.url,
                hasBrowserExtension: !isWcAdapter,
                extensionNotFound: isWcAdapter ? false : !isInstalled,
                isLoadable: wallet.readyState === 'Loadable' && adapterName !== 'Coinbase Wallet',
                providerName: name,
                order: resolveWalletConnectorIndex(adapterName.toLowerCase()),
            }
            installed.push(internalConnector)
        }

        const installedKeys = new Set(installed.map(connector => walletKey(connector.name)))
        for (const reg of walletConnectConnectors) {
            if (installedKeys.has(walletKey(reg.name)) || installedKeys.has(walletKey(reg.id))) continue
            registry.push(createRegistryConnector(reg, isMobilePlatform, name))
        }

        return { availableConnectors: installed, additionalConnectors: registry }
    }, [wallets, walletConnectConnectors, isMobilePlatform])

    const isNotAvailableCondition = useCallback((connectorId: string | undefined, network: string | undefined, purpose?: "withdrawal" | "autofill" | "asSource") => {
        if (!network) return false
        if (!connectorId) return true

        if (!purpose) {
            return resolveSupportedNetworks([network], connectorId).length === 0
        }

        const supportedNetworksByPurpose = resolveSupportedNetworks(commonSupportedNetworks, connectorId)
        return supportedNetworksByPurpose.length === 0 || !supportedNetworksByPurpose.includes(network)
    }, [commonSupportedNetworks])

    const requestAdditionalConnectors = useCallback(async (params: RequestAdditionalConnectorsParams = {}): Promise<RequestAdditionalConnectorsResult> => {
        const result = await requestRegistryConnectors(params)
        const installedKeys = new Set(availableConnectors.map(connector => walletKey(connector.name)))

        return {
            connectors: result.connectors
                .filter(connector => !installedKeys.has(walletKey(connector.name)) && !installedKeys.has(walletKey(connector.id)))
                .map(connector => createRegistryConnector(connector, isMobilePlatform, name)),
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }, [requestRegistryConnectors, availableConnectors, isMobilePlatform, name])

    const providerIcon = useMemo(() => networks.find(n => solanaNames.some(name => name === n.name))?.logo, [networks])

    const provider: WalletProvider = useMemo(() => ({
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        connectWallet,
        disconnectWallets: disconnectWallet,
        isNotAvailableCondition,
        availableConnectors,
        additionalConnectors,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon,
        ready: wallets.length > 0,
        requestAdditionalConnectors,
        registryWallets: walletConnectConnectors,
    }), [connectedWallets, connectWallet, disconnectWallet, isNotAvailableCondition, availableConnectors, additionalConnectors, commonSupportedNetworks, name, id, providerIcon, wallets.length, requestAdditionalConnectors, walletConnectConnectors])

    return provider
}

const networkSupport = {
    soon: ["okx wallet", "tokenpocket", "nightly"],
    eclipse: ["nightly", "backpack"],
};

function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
    const supportedNetworksForWallet: string[] = [];

    supportedNetworks.forEach((network) => {
        const lowerCaseName = network.split("_")[0].toLowerCase();
        if (lowerCaseName === "solana") {
            supportedNetworksForWallet.push(network);
        } else if (networkSupport[lowerCaseName] && networkSupport[lowerCaseName].includes(connectorId?.toLowerCase())) {
            supportedNetworksForWallet.push(network);
        }
    });

    return supportedNetworksForWallet;
}
