import KnownInternalNames from "../../knownIds"
import { useWallet } from "@solana/wallet-adapter-react"
import { resolveWalletConnectorIcon, resolveWalletConnectorIndex } from "../utils/resolveWalletIcon"
import { NetworkType } from "@/Models/Network"
import { InternalConnector, Wallet, WalletProvider } from "@/Models/WalletProvider"
import { useCallback, useEffect, useMemo } from "react"
import { useSettingsState } from "@/context/settings"
import { useConnectModal, WalletModalConnector } from "@/components/WalletModal"
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile"
import { useWalletConnectConnectors } from "@/lib/wallets/walletConnect/context"
import {
    WC_REGISTRY_MARKER,
    getRegistryEntry,
    type RegistryAttachedConnector,
} from "@/lib/wallets/walletConnect/types"
import { buildDeepLink } from "@/lib/wallets/walletConnect/buildDeepLink"
import { subscribeDisplayUri } from "@/lib/wallets/walletConnect/subscribeDisplayUri"
import { mapConnectError } from "@/lib/wallets/walletConnect/mapConnectError"
import {
    getDynamicWcMetadata,
    setDynamicWcMetadata,
    setPendingDynamicWcMetadata,
    getPendingDynamicWcMetadata,
    clearPendingDynamicWcMetadata,
} from "@/lib/wallets/walletConnect/dynamicMetadata"
import { SolanaWalletConnectAdapter } from "./SolanaWalletConnectAdapter"

const SOLANA_NS = 'solana'
const SOLANA_WC_ADAPTER_NAME = 'WalletConnect'

type RegistryConnector = RegistryAttachedConnector<InternalConnector>

const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

export default function useSVM(): WalletProvider {
    const { networks } = useSettingsState()
    const isMobilePlatform = useMemo(() => isMobile(), [])

    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ]

    const name = 'Solana'
    const id = 'solana'
    const { disconnect, select, wallets, wallet: solanaWallet } = useWallet()
    const connectedWallet = solanaWallet?.adapter.connected === true ? solanaWallet : undefined
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const {
        connectors: walletConnectConnectors,
        loaded: walletConnectWalletsLoaded,
        load: loadWalletConnectWallets,
        addRecent: addWalletConnectWallet,
        loadMore: loadMoreWcWallets,
        hasMore: hasMoreWcWallets,
        isLoadingMore: isLoadingMoreWcWallets,
        search: searchWcWallets,
    } = useWalletConnectConnectors(SOLANA_NS)

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectWalletsLoaded) {
            loadWalletConnectWallets().catch((error) => console.warn('Failed to load Solana WalletConnect wallets registry', error))
        }
        // Pre-warm the WC provider so the user's first wallet click doesn't wait
        // for UP.init() — the cold init is what makes recent-wallet reconnects
        // after a refresh spin on "QR loading" for several seconds.
        if (isWalletModalOpen) {
            const wcAdapterEntry = wallets.find(w => w.adapter.name === SOLANA_WC_ADAPTER_NAME)
            const wcAdapter = wcAdapterEntry?.adapter as unknown as SolanaWalletConnectAdapter | undefined
            wcAdapter?.warmup?.()
        }
    }, [isWalletModalOpen, walletConnectWalletsLoaded, loadWalletConnectWallets, wallets])

    const connectedWallets = useMemo(() => {

        if (solanaWallet?.adapter.connected === true) {
            const isWalletConnect = connectedAdapterName === SOLANA_WC_ADAPTER_NAME
            const dynamicMeta = (isWalletConnect && connectedAddress)
                ? (getDynamicWcMetadata(SOLANA_NS, connectedAddress) || getPendingDynamicWcMetadata(SOLANA_NS))
                : null

            const displayName = dynamicMeta?.name || connectedAdapterName
            const displayIcon = dynamicMeta?.icon || connectedWallet?.adapter.icon
            const displayId = dynamicMeta?.id || (connectedAdapterName ? String(connectedAdapterName) : undefined)

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

    }, [connectedAddress, connectedAdapterName, solanaWallet, disconnect, commonSupportedNetworks, networks])

    const connectWallet = async ({ connector }: { connector: WalletModalConnector }) => {
        let unsubscribeDisplayUri: (() => void) | undefined
        const registry = getRegistryEntry(connector)
        try {
            const isRegistryWallet = !!registry
            const isBareWcTile = connector.name === SOLANA_WC_ADAPTER_NAME
            const installedAdapter = wallets.find(w => w.adapter.name === connector.name) ||
                wallets.find(w => w.adapter.name.includes(connector.name))
            const walletConnectAdapter = wallets.find(w => w.adapter.name === SOLANA_WC_ADAPTER_NAME)

            // Decide which adapter actually performs the connect:
            // - Registry WC wallets and the bare WC tile always go through the WC adapter
            // - Installed adapters that explicitly want a QR (showQrCode) or are missing on mobile fall back to WC
            const useWalletConnect = isRegistryWallet || isBareWcTile
                || (connector.hasBrowserExtension && (connector.showQrCode || (isMobilePlatform && connector.extensionNotFound)))

            const targetAdapterEntry = useWalletConnect ? walletConnectAdapter : installedAdapter
            if (!targetAdapterEntry) throw new Error('Connector not found')

            if (connectedWallet) {
                try { await targetAdapterEntry.adapter.disconnect() } catch { /* noop */ }
            }

            const resolveURI = registry
                ? (uri: string) => buildDeepLink({ id: registry.id, mobile: registry.mobile }, uri)
                : undefined

            if (useWalletConnect && walletConnectAdapter) {
                const wcAdapter = walletConnectAdapter.adapter as unknown as SolanaWalletConnectAdapter

                if (registry) {
                    // Track display metadata so connectedWallets can render the right name/icon after success
                    setPendingDynamicWcMetadata(SOLANA_NS, {
                        name: registry.name,
                        icon: registry.icon || '',
                        id: registry.id,
                    })
                } else {
                    clearPendingDynamicWcMetadata(SOLANA_NS)
                }

                // Pre-render the QR loading state so the modal switches screens immediately
                setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true })

                unsubscribeDisplayUri = subscribeDisplayUri({
                    source: wcAdapter,
                    resolveURI,
                    isMobilePlatform,
                    onQr: (qr) => setSelectedConnector({ ...connector, qr, showQrCode: true }),
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
                : wallets.find(w => w.adapter.connected === true)
            const newAddress = newConnectedWallet?.adapter.publicKey?.toBase58()

            // Persist display metadata for reconnects after refresh
            if (newAddress && useWalletConnect && registry) {
                setDynamicWcMetadata(SOLANA_NS, newAddress, {
                    name: registry.name,
                    icon: registry.icon || '',
                    id: registry.id,
                })
            }

            const displayId = registry?.id || (newConnectedWallet?.adapter.name ? String(newConnectedWallet.adapter.name) : undefined)
            const displayName = registry?.name || newConnectedWallet?.adapter.name
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
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect = useMemo(() => {
        const connectors: InternalConnector[] = []
        const seenIds = new Set<string>()
        const seenNames = new Set<string>()

        for (const wallet of wallets) {
            const isWcAdapter = wallet.adapter.name === SOLANA_WC_ADAPTER_NAME
            const isInstalled = wallet.readyState === 'Installed' || wallet.readyState === 'Loadable' || wallet.adapter.name === 'Coinbase Wallet'
            const internalConnector: InternalConnector = {
                name: wallet.adapter.name.trim(),
                id: wallet.adapter.name.trim(),
                icon: wallet.adapter.icon,
                type: isInstalled ? 'injected' : 'other',
                installUrl: wallet.adapter?.url,
                // The bare WalletConnect tile must show our QR (no extension) — installed adapters are extension-backed
                hasBrowserExtension: !isWcAdapter,
                extensionNotFound: isWcAdapter ? false : !isInstalled,
                providerName: name,
                order: resolveWalletConnectorIndex(wallet.adapter.name.trim().toLowerCase()),
            }
            connectors.push(internalConnector)
            seenIds.add(internalConnector.id.toLowerCase())
            seenNames.add(internalConnector.name.toLowerCase())
        }

        // Append registry-driven WC wallets that aren't already represented as installed adapters.
        // Each registry connector carries a hidden marker so the connect flow can retrieve the full registry entry.
        for (const registry of walletConnectConnectors) {
            if (seenIds.has(registry.id.toLowerCase())) continue
            if (seenNames.has(registry.name.toLowerCase())) continue
            const registryConnector: RegistryConnector = {
                id: registry.id,
                name: registry.name,
                icon: registry.icon,
                type: 'walletConnect',
                order: registry.order,
                isMobileSupported: registry.isMobileSupported,
                hasBrowserExtension: registry.hasBrowserExtension,
                installUrl: registry.installUrl,
                extensionNotFound: registry.hasBrowserExtension ? !isMobilePlatform : false,
                providerName: name,
                [WC_REGISTRY_MARKER]: registry,
            }
            connectors.push(registryConnector)
        }

        return connectors
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

    const searchWallets = useCallback(async (query: string): Promise<InternalConnector[]> => {
        const results = await searchWcWallets(query)
        return results.map((w): RegistryConnector => ({
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
    }, [searchWcWallets, isMobilePlatform, name])

    const provider: WalletProvider = {
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        connectWallet,
        disconnectWallets: disconnectWallet,
        isNotAvailableCondition,
        availableWalletsForConnect,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo,
        ready: wallets.length > 0,
        loadMoreWallets: loadMoreWcWallets,
        hasMoreWallets: hasMoreWcWallets,
        isLoadingMoreWallets: isLoadingMoreWcWallets,
        searchWallets,
    }

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
