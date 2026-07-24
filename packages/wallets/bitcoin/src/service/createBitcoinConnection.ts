import type {
    MultiStepHandler,
    NetworkWithTokens,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@layerswap/widget/types'
import { connectModalStore, createMemoizedConnectionStore } from '@layerswap/widget/internal'
import { createBitcoinTransfer } from '../transferProvider/createBitcoinTransfer'
import { bitcoinConnectionService } from './BitcoinConnectionService'
import { useBitcoinStore } from './bitcoinStore'

type CreateBitcoinConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Bitcoin wallet connection. Replaces the
 * old `useBitcoinConnection` hook.
 */
export function createBitcoinConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateBitcoinConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options

    let networks: NetworkWithTokens[] = initialProps.networks
    bitcoinConnectionService.setNetworks(networks)
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
            bitcoinConnectionService.setNetworks(networks)
        },
    })
}
