import { useWallet } from "@solana/wallet-adapter-react"
import { isMobile, useConnectModal } from "@layerswap/widget/internal"
import { InternalConnector, Wallet, WalletConnectionProvider, NetworkType, WalletConnectionProviderProps, WalletModalConnector } from "@layerswap/widget/types"
import { useMemo, useCallback, useRef, useEffect } from "react"
import { resolveSolanaWalletConnectorIcon } from "./utils"
import { useSVMTransfer } from "./transferProvider/useSVMTransfer"
import { name, id, solanaNames } from "./constants"

const SOLANA_WC_ADAPTER_NAME = 'WalletConnect'

export default function useSVMConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const isMobilePlatform = useMemo(() => isMobile(), [])

    const commonSupportedNetworks = useMemo(() => [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ], [networks])

    const { disconnect, select, wallets, wallet: solanaWallet } = useWallet()
    const walletsRef = useRef(wallets)
    walletsRef.current = wallets
    const connectedWallet = solanaWallet?.adapter.connected === true ? solanaWallet : undefined
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const {
        browseConnectors: walletConnectConnectors,
        browseMetadata: walletConnectBrowseMetadata,
        requestAdditionalConnectors: requestRegistryConnectors,
        addRecentConnector: addWalletConnectWallet,
    } = useAdditionalConnectors(id)

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectBrowseMetadata.loaded) {
            requestRegistryConnectors({ page: 1, pageSize: 40 }).catch((error) => console.warn('Failed to load Solana WalletConnect wallets registry', error))
        }
        // Pre-warm the WC provider so the user's first wallet click doesn't wait
        // for UP.init() — the cold init is what makes recent-wallet reconnects
        // after a refresh spin on "QR loading" for several seconds.
        if (isWalletModalOpen) {
            const wcAdapterEntry = walletsRef.current.find(w => w.adapter.name === SOLANA_WC_ADAPTER_NAME)
            const wcAdapter = wcAdapterEntry?.adapter as unknown as SolanaWalletConnectAdapter | undefined
            wcAdapter?.warmup?.()
        }
    }, [isWalletModalOpen, walletConnectBrowseMetadata.loaded, requestRegistryConnectors])

    const connectedWallets = useMemo(() => {

        if (solanaWallet?.adapter.connected === true) {
            const isWalletConnect = connectedAdapterName === SOLANA_WC_ADAPTER_NAME
            const dynamicMeta = (isWalletConnect && connectedAddress)
                ? (getDynamicWcMetadata(id, connectedAddress) || getPendingDynamicWcMetadata(id))
                : null

            const displayName = dynamicMeta?.name || connectedAdapterName
            const displayIcon = dynamicMeta?.icon || connectedWallet?.adapter.icon
            const displayId = dynamicMeta?.id || (connectedAdapterName ? String(connectedAdapterName) : undefined)

            const wallet: Wallet | undefined = (connectedAddress && displayId) ? {
                id: displayId,
                address: connectedAddress,
                displayName: `${displayName} - Solana`,
                providerName: name,
                icon: resolveSolanaWalletConnectorIcon({ connector: String(connectedAdapterName), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
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

    const connectWallet = useCallback(async ({ connector }: { connector: WalletModalConnector }) => {
        let unsubscribeDisplayUri: (() => void) | undefined
        const registry = getRegistryEntry(connector)
        try {
            const isRegistryWallet = !!registry
            const isBareWcTile = connector.name === SOLANA_WC_ADAPTER_NAME
            const currentWallets = walletsRef.current
            const installedAdapter = currentWallets.find(w => w.adapter.name === connector.name) ||
                currentWallets.find(w => w.adapter.name.includes(connector.name))
            const walletConnectAdapter = currentWallets.find(w => w.adapter.name === SOLANA_WC_ADAPTER_NAME)

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

                // Track display metadata so connectedWallets can render the right name/icon after success
                setPendingMetadataForRegistry(id, registry)

                // Only pre-render the QR screen when we actually want the user to see it:
                // - Desktop → QR modal.
                // - Mobile WITHOUT a resolvable deeplink (e.g. bare WC tile) → QR fallback so
                //   the user isn't stuck on a spinner.
                // On mobile WITH a deeplink, leave `qr` unset so ConnectorsList renders the
                // neutral LoadingConnect screen; `subscribeDisplayUri` will then navigate via
                // `window.location.href = deepLink` as soon as the URI arrives.
                const wantsQrModal = !isMobilePlatform || !resolveURI

                if (wantsQrModal) {
                    setSelectedConnector({ ...connector, qr: { state: 'loading', value: undefined }, showQrCode: true })
                } else {
                    setSelectedConnector({ ...connector })
                }

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
                : walletsRef.current.find(w => w.adapter.connected === true)
            const newAddress = newConnectedWallet?.adapter.publicKey?.toBase58()

            // Persist display metadata for reconnects after refresh
            if (newAddress && useWalletConnect && registry) {
                setDynamicWcMetadata(id, newAddress, {
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
            if (registry) clearPendingDynamicWcMetadata(id)
        }
    }, [connectedWallet, disconnect, select, isMobilePlatform, setSelectedConnector, addWalletConnectWallet, commonSupportedNetworks, networks, name])

    const disconnectWallet = useCallback(async () => {
        try {
            await disconnect()
        }
        catch (e) {
            //TODO: handle error
            console.log(e)
        }
    }, [disconnect])

    const { executeTransfer: transfer } = useSVMTransfer()

    const { availableConnectors, additionalConnectors } = useMemo(() => {
        const installed: InternalConnector[] = []
        const registry: InternalConnector[] = []
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
                hasBrowserExtension: !isWcAdapter,
                extensionNotFound: isWcAdapter ? false : !isInstalled,
                providerName: name,
                order: resolveWalletConnectorIndex(wallet.adapter.name.trim().toLowerCase()),
            }
            installed.push(internalConnector)
            seenIds.add(internalConnector.id.toLowerCase())
            seenNames.add(internalConnector.name.toLowerCase())
        }

        for (const reg of walletConnectConnectors) {
            if (seenIds.has(reg.id.toLowerCase())) continue
            if (seenNames.has(reg.name.toLowerCase())) continue
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
        const installedConnectorIds = new Set(availableConnectors.map(connector => connector.id.toLowerCase()))
        const installedConnectorNames = new Set(availableConnectors.map(connector => connector.name.toLowerCase()))

        return {
            connectors: result.connectors
                .filter(connector => !installedConnectorIds.has(connector.id.toLowerCase()) && !installedConnectorNames.has(connector.name.toLowerCase()))
                .map(connector => createRegistryConnector(connector, isMobilePlatform, name)),
            nextPage: result.nextPage,
            totalCount: result.totalCount,
        }
    }, [requestRegistryConnectors, availableConnectors, isMobilePlatform, name])

    const providerIcon = useMemo(() => networks.find(n => solanaNames.some(name => name === n.name))?.logo, [networks])

    const provider: WalletConnectionProvider = useMemo(() => ({
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        connectWallet,
        disconnectWallets: disconnectWallet,

        transfer,

        isNotAvailableCondition,
        availableConnectors,
        additionalConnectors,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        name,
        id,
        providerIcon,
        ready: wallets.length > 0,
        requestAdditionalConnectors,
    }), [connectedWallets, connectWallet, disconnectWallet, isNotAvailableCondition, availableConnectors, additionalConnectors, commonSupportedNetworks, name, id, providerIcon, wallets.length, requestAdditionalConnectors])

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
