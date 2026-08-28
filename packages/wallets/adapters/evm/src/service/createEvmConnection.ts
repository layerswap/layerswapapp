import type { WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore, MultiStepHandler } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { NetworkType } from "@layerswap/widget-types"
import { connectModalStore, createMemoizedConnectionStore, getAdditionalConnectorsStore } from "@layerswap/wallet-core"
import { id as PROVIDER_ID, name as PROVIDER_NAME } from '../constants'
import { createEvmTransfer } from '../transferProvider/createEvmTransfer'
import { supportsRegistryConnects } from './connectorsHelpers'
import { EvmConnectionService } from './EvmConnectionService'
import { findEthereumNetwork } from './findEthereumNetwork'
import { useEvmStore } from './evmStore'
import type { EvmAdditionalSupportedNetworks } from './networkBuckets'

const EVM_NS = 'eip155'

type CreateEvmConnectionOptions = {
    walletConnectProjectId?: string
    extraMultiStepHandlers?: MultiStepHandler[]
    additionalSupportedNetworks?: EvmAdditionalSupportedNetworks
    ethereumChainIds?: readonly number[]
}

/**
 * Vanilla external-store factory for the EVM wallet connection. Replaces
 * the old `useEvmConnection` hook. The widget consumes this via
 * `useSyncExternalStore`; wallet packages and other non-React callers can
 * read snapshots imperatively.
 */
export function createEvmConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateEvmConnectionOptions = {},
): WalletConnectionStore<Network> {
    const {
        walletConnectProjectId,
        extraMultiStepHandlers = [],
        additionalSupportedNetworks,
        ethereumChainIds = [],
    } = options
    const isMobilePlatform = isMobile()

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const evmConnectionService = new EvmConnectionService<Network>()
    evmConnectionService.setNetworks(networks, networkAdapter, additionalSupportedNetworks)

    const additionalConnectorsStore = getAdditionalConnectorsStore(EVM_NS, walletConnectProjectId)

    evmConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        addRecentConnector: additionalConnectorsStore.addRecentConnector,
        requestRegistryConnectors: additionalConnectorsStore.requestAdditionalConnectors,
        registryConnectors: additionalConnectorsStore.getSnapshot().browseConnectors,
        recentConnectors: additionalConnectorsStore.getSnapshot().recentConnectors,
        isMobilePlatform,
        ethereumChainIds,
    })

    const transferProvider = createEvmTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const evmState = useEvmStore.getState()
            const additionalState = additionalConnectorsStore.getSnapshot()
            return {
                connections: evmState.connections,
                allConnectors: evmState.allConnectors,
                wagmiAccount: evmState.wagmiAccount,
                selectedAddress: evmState.selectedAddress,
                browseConnectors: additionalState.browseConnectors,
                recentConnectors: additionalState.recentConnectors,
                networks,
            }
        },
        buildSnapshot: inputs => {
            evmConnectionService.configure({
                registryConnectors: inputs.browseConnectors,
                recentConnectors: inputs.recentConnectors,
            })

            const { wagmiAccount, selectedAddress, allConnectors, connections } = inputs

            const isSelectedAddressActive = !!selectedAddress
                && !!wagmiAccount.addresses
                && wagmiAccount.addresses.some(addr => addr === selectedAddress)
            const activeConnectionId = wagmiAccount.connectorId
            const activeAddress = isSelectedAddressActive ? selectedAddress : wagmiAccount.address
            const activeConnection = activeConnectionId && activeAddress
                ? { id: activeConnectionId, address: activeAddress }
                : undefined

            const connectedWallets = evmConnectionService.getConnectedWallets(connections, activeConnection)
            const activeWallet = evmConnectionService.getActiveWallet(connectedWallets)
            const availableConnectors = evmConnectionService.getAvailableConnectors(allConnectors)
            const additionalConnectors = evmConnectionService.getAdditionalConnectors(allConnectors)
            const providerNetwork = findEthereumNetwork(inputs.networks, networkAdapter, ethereumChainIds)
            const providerIcon = providerNetwork ? networkAdapter.getIcon(providerNetwork) : undefined
            const buckets = evmConnectionService.getBuckets()
            const registryCapabilities = supportsRegistryConnects(allConnectors)
                ? {
                    walletConnectRegistry: {
                        networkTypes: [NetworkType.EVM],
                    },
                }
                : undefined

            const snapshot: WalletConnectionProvider = {
                connectWallet: evmConnectionService.connectWallet.bind(evmConnectionService),
                disconnectWallets: evmConnectionService.disconnectWallets.bind(evmConnectionService),
                switchAccount: evmConnectionService.switchAccount.bind(evmConnectionService),
                switchChain: evmConnectionService.switchChain.bind(evmConnectionService),
                isNotAvailableCondition: evmConnectionService.isNotAvailable.bind(evmConnectionService),
                requestAdditionalConnectors: evmConnectionService.requestAdditionalConnectors.bind(evmConnectionService),

                transfer,

                connectedWallets,
                activeWallet,
                autofillSupportedNetworks: buckets.autofill,
                withdrawalSupportedNetworks: buckets.withdrawal,
                asSourceSupportedNetworks: buckets.asSource,
                availableConnectors,
                additionalConnectors,
                name: PROVIDER_NAME,
                id: PROVIDER_ID,
                capabilities: registryCapabilities,
                providerIcon,
                ready: evmConnectionService.getReady(allConnectors),
                multiStepHandlers: extraMultiStepHandlers,
            }

            return snapshot
        },
        subscribe: sync => [
            useEvmStore.subscribe(sync),
            additionalConnectorsStore.subscribe(sync),
            connectModalStore.subscribe(() => {
                const modal = connectModalStore.getSnapshot()
                if (modal.isWalletModalOpen) {
                    // Deduped + status-tracked (loading/error) so the widget's
                    // settle gate and loading tail observe this fetch.
                    void additionalConnectorsStore.ensureBrowseLoaded()
                }
            }),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            evmConnectionService.setNetworks(networks, networkAdapter, additionalSupportedNetworks)
        },
    })
}
