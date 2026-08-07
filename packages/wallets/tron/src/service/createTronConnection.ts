import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/ui-kit/types"
import { createMemoizedConnectionStore, getEip6963Providers, subscribeEip6963Providers, type AppNetworkAdapter } from "@layerswap/ui-kit"
import { createTronTransfer } from '../transferProvider/createTronTransfer'
import { TronConnectionService } from './TronConnectionService'
import { useTronStore } from './tronStore'

type CreateTronConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Tron wallet connection. Replaces the
 * old `useTronConnection` hook. The widget consumes this via `useSyncExternalStore`.
 */
export function createTronConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateTronConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const tronConnectionService = new TronConnectionService<Network>()
    tronConnectionService.setNetworks(networks, networkAdapter)

    const transferProvider = createTronTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = useTronStore.getState()
            return {
                wallets: state.wallets,
                activeWalletName: state.activeWalletName,
                activeAddress: state.activeAddress,
                ready: state.ready,
                networks,
                eip6963Providers: getEip6963Providers(),
            }
        },
        buildSnapshot: () => ({
            ...tronConnectionService.buildProvider(),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }),
        subscribe: sync => [
            useTronStore.subscribe(sync),
            subscribeEip6963Providers(sync),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            tronConnectionService.setNetworks(networks, networkAdapter)
        },
    })
}
