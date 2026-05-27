import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
    MultiStepHandler,
    NetworkWithTokens,
} from '@layerswap/widget/types'
import {
    connectModalStore,
    getAdditionalConnectorsStore,
    isMobile,
} from '@layerswap/widget/internal'
import { createStore } from 'zustand/vanilla'
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

    type SnapshotInputs = {
        connections: unknown
        allConnectors: unknown
        wagmiAccount: unknown
        selectedAddress: unknown
        browseConnectors: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    function computeSnapshot(): WalletConnectionProvider {
        const evmState = useEvmStore.getState()
        const additionalState = additionalConnectorsStore.getSnapshot()

        const inputs: SnapshotInputs = {
            connections: evmState.connections,
            allConnectors: evmState.allConnectors,
            wagmiAccount: evmState.wagmiAccount,
            selectedAddress: evmState.selectedAddress,
            browseConnectors: additionalState.browseConnectors,
            networks,
        }

        if (lastInputs
            && lastInputs.connections === inputs.connections
            && lastInputs.allConnectors === inputs.allConnectors
            && lastInputs.wagmiAccount === inputs.wagmiAccount
            && lastInputs.selectedAddress === inputs.selectedAddress
            && lastInputs.browseConnectors === inputs.browseConnectors
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        evmConnectionService.configure({
            registryConnectors: additionalState.browseConnectors,
        })

        const wagmiAccount = evmState.wagmiAccount
        const selectedAddress = evmState.selectedAddress
        const allConnectors = evmState.allConnectors
        const connections = evmState.connections

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
        const providerIcon = networks.find(n => ethereumNames.some(name => name === n.name))?.logo
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

        lastInputs = inputs
        lastSnapshot = snapshot
        return snapshot
    }

    const store = createStore<WalletConnectionProvider>(() => computeSnapshot())

    const sync = () => {
        const next = computeSnapshot()
        if (store.getState() === next) return
        store.setState(next, true)
    }

    const unsubs: (() => void)[] = [
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
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            evmConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
