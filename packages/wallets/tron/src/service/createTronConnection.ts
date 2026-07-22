import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { createMemoizedConnectionStore, getEip6963Providers, subscribeEip6963Providers } from "@layerswap/wallet-core"
import { createTronTransfer } from '../transferProvider/createTronTransfer'
import { tronConnectionService } from './TronConnectionService'
import { useTronStore } from './tronStore'

type CreateTronConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Tron wallet connection. Replaces the
 * old `useTronConnection` hook. The widget consumes this via `useSyncExternalStore`.
 */
export function createTronConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateTronConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    tronConnectionService.setNetworks(networks)

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
            tronConnectionService.setNetworks(networks)
        },
    })
}
