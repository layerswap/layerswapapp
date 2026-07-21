import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { connectModalStore } from "@layerswap/wallet-core"
import { createStore } from 'zustand/vanilla'
import { createTonTransfer } from '../transferProvider/createTonTransfer'
import { tonConnectionService } from './TonConnectionService'
import { useTonStore } from './tonStore'

type CreateTonConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the TON wallet connection. Replaces the
 * old `useTonConnection` hook. The widget consumes this via `useSyncExternalStore`.
 */
export function createTonConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateTonConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options
    const isMobilePlatform = isMobile()

    let networks: NetworkWithTokens[] = initialProps.networks
    tonConnectionService.setNetworks(networks)
    tonConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        isMobilePlatform,
    })

    const transferProvider = createTonTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        tonWallet: unknown
        wallets: unknown
        ready: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const state = useTonStore.getState()
        const inputs: SnapshotInputs = {
            tonWallet: state.tonWallet,
            wallets: state.wallets,
            ready: state.ready,
            networks,
        }
        if (lastInputs
            && lastInputs.tonWallet === inputs.tonWallet
            && lastInputs.wallets === inputs.wallets
            && lastInputs.ready === inputs.ready
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
            ...tonConnectionService.buildProvider(state.tonWallet),
            transfer,
            multiStepHandlers: extraMultiStepHandlers,
        }

        lastInputs = inputs
        lastSnapshot = snapshot
        return snapshot
    }

    const store = createStore<WalletConnectionProvider>(() => computeSnapshot())

    const sync = () => {
        const next = computeSnapshot()
        if (store.getState() === next) return
        store.setState(next, true)
    }

    const unsubs: (() => void)[] = [
        useTonStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            tonConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
