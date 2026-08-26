import type { WalletConnectionProviderProps, WalletConnectionStore } from '@layerswap/wallet-core/types'
import { createMemoizedConnectionStore } from '@layerswap/wallet-core'
import { StellarConnectionService } from './StellarConnectionService'
import { stellarStore } from './stellarStore'

export function createStellarConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
): WalletConnectionStore<Network> {
    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const service = new StellarConnectionService<Network>()
    service.setNetworks(networks, networkAdapter)

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = stellarStore.getState()
            return {
                wallets: state.wallets,
                activeWalletId: state.activeWalletId,
                activeAddress: state.activeAddress,
                networkPassphrase: state.networkPassphrase,
                ready: state.ready,
                error: state.error,
                networks,
            }
        },
        buildSnapshot: () => service.buildProvider(),
        subscribe: sync => [stellarStore.subscribe(sync)],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            service.setNetworks(networks, networkAdapter)
        },
    })
}
