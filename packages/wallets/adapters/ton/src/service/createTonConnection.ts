import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { connectModalStore, createMemoizedConnectionStore } from "@layerswap/wallet-core"
import { createTonTransfer } from '../transferProvider/createTonTransfer'
import { TonConnectionService } from './TonConnectionService'
import { useTonStore } from './tonStore'

type CreateTonConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the TON wallet connection. Replaces the
 * old `useTonConnection` hook. The widget consumes this via `useSyncExternalStore`.
 */
export function createTonConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateTonConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options
    const isMobilePlatform = isMobile()

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const tonConnectionService = new TonConnectionService<Network>()
    tonConnectionService.setNetworks(networks, networkAdapter)
    tonConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        isMobilePlatform,
    })

    const transferProvider = createTonTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = useTonStore.getState()
            return {
                tonWallet: state.tonWallet,
                wallets: state.wallets,
                ready: state.ready,
                networks,
            }
        },
        buildSnapshot: inputs => ({
            ...tonConnectionService.buildProvider(inputs.tonWallet),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }),
        subscribe: sync => [
            useTonStore.subscribe(sync),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            tonConnectionService.setNetworks(networks, networkAdapter)
        },
    })
}
