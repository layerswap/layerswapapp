import type {
    NetworkWithTokens,
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@layerswap/widget/types'
import {
    connectModalStore,
    useWalletStore,
    walletProvidersRegistry,
} from '@layerswap/widget/internal'
import { createStore } from 'zustand/vanilla'
import ParadexMultiStepHandler from '../components/ParadexMultiStepHandler'
import {
    asSourceSupportedNetworks,
    autofillSupportedNetworks,
    id,
    name,
    paradexConnectionService,
    withdrawalSupportedNetworks,
} from './ParadexConnectionService'
import { useParadexActiveStore } from './paradexActiveStore'

/**
 * Vanilla external-store factory for the Paradex wallet connection. Replaces
 * the old `useParadexConnection` hook + `ActiveParadexAccount` React context.
 */
export function createParadexConnection(
    initialProps: WalletConnectionProviderProps,
): WalletConnectionStore {
    let networks: NetworkWithTokens[] = initialProps.networks
    paradexConnectionService.setNetworks(networks)
    paradexConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
    })

    type SnapshotInputs = {
        evmSnapshot: unknown
        starknetSnapshot: unknown
        paradexAccounts: unknown
        selectedAccount: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const evmSnapshot = walletProvidersRegistry.getById('evm')
        const starknetSnapshot = walletProvidersRegistry.getById('starknet')
        const paradexAccounts = useWalletStore.getState().paradexAccounts
        const selectedAccount = useParadexActiveStore.getState().selectedAccount

        const inputs: SnapshotInputs = {
            evmSnapshot,
            starknetSnapshot,
            paradexAccounts,
            selectedAccount,
            networks,
        }
        if (lastInputs
            && lastInputs.evmSnapshot === inputs.evmSnapshot
            && lastInputs.starknetSnapshot === inputs.starknetSnapshot
            && lastInputs.paradexAccounts === inputs.paradexAccounts
            && lastInputs.selectedAccount === inputs.selectedAccount
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        const snapshot: WalletConnectionProvider = {
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
            multiStepHandlers: [
                {
                    component: ParadexMultiStepHandler,
                    supportedNetworks: withdrawalSupportedNetworks,
                },
            ],
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
        useWalletStore.subscribe(sync),
        walletProvidersRegistry.subscribe(sync),
        useParadexActiveStore.subscribe(sync),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            paradexConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
