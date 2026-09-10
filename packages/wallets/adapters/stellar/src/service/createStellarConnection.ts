import type { WalletConnectionProviderProps, WalletConnectionStore } from '@layerswap/wallet-core/types'
import type { WalletModalConnector } from '@layerswap/wallet-core/types'
import { connectModalStore, createMemoizedConnectionStore, getAdditionalConnectorsStore } from '@layerswap/wallet-core'
import { isMobile } from '@layerswap/utils'
import { id as PROVIDER_ID } from '../constants'
import { StellarConnectionService } from './StellarConnectionService'
import { stellarKitManager } from './stellarKitManager'
import { stellarStore } from './stellarStore'

type CreateStellarConnectionOptions = {
    walletConnectProjectId?: string
}

export function createStellarConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateStellarConnectionOptions = {},
): WalletConnectionStore<Network> {
    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const service = new StellarConnectionService<Network>()
    service.setNetworks(networks, networkAdapter)
    const additionalConnectorsStore = options.walletConnectProjectId
        ? getAdditionalConnectorsStore(PROVIDER_ID, options.walletConnectProjectId)
        : undefined

    service.configure({
        setSelectedConnector: connector => connectModalStore.setSelectedConnector(connector),
        getSelectedConnector: () => connectModalStore.getSnapshot().selectedConnector as WalletModalConnector | undefined,
        addRecentConnector: additionalConnectorsStore?.addRecentConnector,
        requestRegistryConnectors: additionalConnectorsStore?.requestAdditionalConnectors,
        registryConnectors: additionalConnectorsStore?.getSnapshot().browseConnectors,
        recentConnectors: additionalConnectorsStore?.getSnapshot().recentConnectors,
        isMobilePlatform: isMobile(),
    })

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = stellarStore.getState()
            const additional = additionalConnectorsStore?.getSnapshot()
            return {
                wallets: state.wallets,
                activeWalletId: state.activeWalletId,
                activeAddress: state.activeAddress,
                networkPassphrase: state.networkPassphrase,
                ready: state.ready,
                error: state.error,
                browseConnectors: additional?.browseConnectors,
                recentConnectors: additional?.recentConnectors,
                networks,
            }
        },
        buildSnapshot: inputs => {
            service.configure({
                registryConnectors: inputs.browseConnectors,
                recentConnectors: inputs.recentConnectors,
            })
            return service.buildProvider()
        },
        subscribe: sync => [
            stellarStore.subscribe(sync),
            ...(additionalConnectorsStore ? [additionalConnectorsStore.subscribe(sync)] : []),
            connectModalStore.subscribe(() => {
                if (!connectModalStore.getSnapshot().isWalletModalOpen) return
                void additionalConnectorsStore?.ensureBrowseLoaded()
                stellarKitManager.warmUpWalletConnect()
            }),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            service.setNetworks(networks, networkAdapter)
        },
    })
}
