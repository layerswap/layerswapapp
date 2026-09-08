import type { MultiStepHandler, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { connectModalStore, createMemoizedConnectionStore } from "@layerswap/wallet-core"
import { createBitcoinTransfer } from '../transferProvider/createBitcoinTransfer'
import { BitcoinConnectionService } from './BitcoinConnectionService'
import { useBitcoinStore } from './bitcoinStore'

type CreateBitcoinConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Bitcoin wallet connection. Replaces the
 * old `useBitcoinConnection` hook.
 */
export function createBitcoinConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateBitcoinConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const bitcoinConnectionService = new BitcoinConnectionService<Network>()
    bitcoinConnectionService.setNetworks(networks, networkAdapter)
    bitcoinConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
    })

    const transferProvider = createBitcoinTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const state = useBitcoinStore.getState()
            return {
                account: state.account,
                resolvedConnectors: state.resolvedConnectors,
                ready: state.ready,
                networks,
            }
        },
        buildSnapshot: () => ({
            ...bitcoinConnectionService.buildProvider(),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }),
        subscribe: sync => [
            useBitcoinStore.subscribe(sync),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            bitcoinConnectionService.setNetworks(networks, networkAdapter)
        },
    })
}
