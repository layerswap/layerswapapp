import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createMemoizedConnectionStore } from "@layerswap/wallet-core"
import { createStarknetTransfer } from '../transferProvider/createStarknetTransfer'
import { starknetConnectionService } from './StarknetConnectionService'
import { useStarknetStore } from './starknetStore'

type CreateStarknetConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Starknet wallet connection. Replaces the
 * old `useStarknetConnection` hook.
 */
export function createStarknetConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateStarknetConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    starknetConnectionService.setNetworks(networks)

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
            starknetConnectionService.setNetworks(networks)
        },
        // This store owns the module-level Starknet hydration lifecycle.
        onDestroy: () => starknetConnectionService.dispose(),
    })
}
