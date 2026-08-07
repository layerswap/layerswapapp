import type { WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/ui-kit/types"
import { connectModalStore, createMemoizedConnectionStore } from "@layerswap/ui-kit"
import { asSourceSupportedNetworks, autofillSupportedNetworks, id, name, ParadexConnectionService, withdrawalSupportedNetworks, } from './ParadexConnectionService'
import { useParadexActiveStore } from './paradexActiveStore'
import { paradexAccountStore } from './paradexAccountStore'

/**
 * Vanilla external-store factory for the Paradex wallet connection. Replaces
 * the old `useParadexConnection` hook + `ActiveParadexAccount` React context.
 */
export function createParadexConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
): WalletConnectionStore<Network> {
    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const peerProviders = initialProps.walletProvidersRegistry
    const paradexConnectionService = new ParadexConnectionService<Network>()
    paradexConnectionService.setNetworks(networks, networkAdapter)
    paradexConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        getProviderById: id => peerProviders?.getById(id),
    })

    return createMemoizedConnectionStore({
        computeInputs: () => ({
            evmSnapshot: peerProviders?.getById('evm'),
            starknetSnapshot: peerProviders?.getById('starknet'),
            paradexAccounts: paradexAccountStore.getState().paradexAccounts,
            selectedAccount: useParadexActiveStore.getState().selectedAccount,
            networks,
        }),
        buildSnapshot: () => ({
            connectWallet: paradexConnectionService.connectWallet.bind(paradexConnectionService),
            switchAccount: paradexConnectionService.switchAccount.bind(paradexConnectionService),
            requestAdditionalConnectors: paradexConnectionService.requestAdditionalConnectors.bind(paradexConnectionService),

            connectedWallets: paradexConnectionService.getConnectedWallets(),
            activeWallet: paradexConnectionService.getActiveWallet(),
            availableConnectors: paradexConnectionService.getAvailableConnectors(),
            additionalConnectors: paradexConnectionService.getAdditionalConnectors(),

            withdrawalSupportedNetworks,
            autofillSupportedNetworks,
            asSourceSupportedNetworks,

            name,
            id,
            providerIcon: paradexConnectionService.getProviderIcon(),
            hideFromList: true,
            ready: paradexConnectionService.isReady(),
        }),
        subscribe: sync => {
            const unsubs = [
                paradexAccountStore.subscribe(sync),
                useParadexActiveStore.subscribe(sync),
            ]
            if (peerProviders) {
                unsubs.push(peerProviders.subscribe(sync))
            }
            return unsubs
        },
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            paradexConnectionService.setNetworks(networks, networkAdapter)
        },
    })
}
