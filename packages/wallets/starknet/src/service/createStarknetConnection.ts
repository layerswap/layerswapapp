import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/ui-kit/types"
import { createMemoizedConnectionStore, type AppNetworkAdapter } from "@layerswap/ui-kit"
import { createStarknetTransfer } from '../transferProvider/createStarknetTransfer'
import { StarknetConnectionService } from './StarknetConnectionService'
import { useStarknetStore } from './starknetStore'

type CreateStarknetConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Starknet wallet connection. Replaces the
 * old `useStarknetConnection` hook.
 */
export function createStarknetConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateStarknetConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const starknetConnectionService = new StarknetConnectionService<Network>()
    starknetConnectionService.setNetworks(networks, networkAdapter)

    const transferProvider = createStarknetTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = useStarknetStore.getState()
            return {
                connectedWallets: state.connectedWallets,
                activeWalletAddress: state.activeWalletAddress,
                connectors: state.connectors,
                ready: state.ready,
                networks,
            }
        },
        buildSnapshot: () => ({
            ...starknetConnectionService.buildProvider(),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }),
        subscribe: sync => [
            useStarknetStore.subscribe(sync),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            starknetConnectionService.setNetworks(networks, networkAdapter)
        },
        // This store owns the module-level Starknet hydration lifecycle.
        onDestroy: () => starknetConnectionService.dispose(),
    })
}
