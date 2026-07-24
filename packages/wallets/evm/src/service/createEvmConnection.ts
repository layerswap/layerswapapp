import type { NetworkWithTokens } from "@layerswap/utils"
import type { WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore, MultiStepHandler } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { connectModalStore, createMemoizedConnectionStore, getAdditionalConnectorsStore } from "@layerswap/wallet-core"
import { ethereumNames, id as PROVIDER_ID, name as PROVIDER_NAME } from '../constants'
import { createEvmTransfer } from '../transferProvider/createEvmTransfer'
import { evmConnectionService } from './EvmConnectionService'
import { useEvmStore } from './evmStore'

const EVM_NS = 'eip155'

type CreateEvmConnectionOptions = {
    walletConnectProjectId?: string
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the EVM wallet connection. Replaces
 * the old `useEvmConnection` hook. The widget consumes this via
 * `useSyncExternalStore`; wallet packages and other non-React callers can
 * read snapshots imperatively.
 */
export function createEvmConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateEvmConnectionOptions = {},
): WalletConnectionStore {
    const { walletConnectProjectId, extraMultiStepHandlers = [] } = options
    const isMobilePlatform = isMobile()

    let networks: NetworkWithTokens[] = initialProps.networks
    evmConnectionService.setNetworks(networks)

    const additionalConnectorsStore = getAdditionalConnectorsStore(EVM_NS, walletConnectProjectId)

    evmConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        addRecentConnector: additionalConnectorsStore.addRecentConnector,
        requestRegistryConnectors: additionalConnectorsStore.requestAdditionalConnectors,
        registryConnectors: additionalConnectorsStore.getSnapshot().browseConnectors,
        isMobilePlatform,
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
                networks,
            }
        },
        buildSnapshot: inputs => {
            evmConnectionService.configure({
                registryConnectors: inputs.browseConnectors,
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
            const providerIcon = inputs.networks.find(n => ethereumNames.some(name => name === n.name))?.logo
            const buckets = evmConnectionService.getBuckets()

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
                if (modal.isWalletModalOpen && !additionalConnectorsStore.getSnapshot().browseMetadata.loaded) {
                    additionalConnectorsStore
                        .requestAdditionalConnectors({ page: 1, pageSize: 40 })
                        .catch(error => console.warn('Failed to load WalletConnect wallets registry', error))
                }
            }),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            evmConnectionService.setNetworks(networks)
        },
    })
}
