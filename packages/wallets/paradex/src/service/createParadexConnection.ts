import type { NetworkWithTokens } from "@layerswap/utils"
import type { WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { connectModalStore } from "@layerswap/wallet-core"
import { createStore } from 'zustand/vanilla'
import {
    asSourceSupportedNetworks,
    autofillSupportedNetworks,
    id,
    name,
    ParadexConnectionService,
    withdrawalSupportedNetworks,
} from './ParadexConnectionService'
import { useParadexActiveStore } from './paradexActiveStore'
import { paradexAccountStore } from './paradexAccountStore'

/**
 * Vanilla external-store factory for the Paradex wallet connection. Replaces
 * the old `useParadexConnection` hook + `ActiveParadexAccount` React context.
 */
export function createParadexConnection(
    initialProps: WalletConnectionProviderProps,
): WalletConnectionStore {
    let networks: NetworkWithTokens[] = initialProps.networks
    const peerProviders = initialProps.walletProvidersRegistry
    const paradexConnectionService = new ParadexConnectionService()
    paradexConnectionService.setNetworks(networks)
    paradexConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        getProviderById: id => peerProviders?.getById(id),
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
        const evmSnapshot = peerProviders?.getById('evm')
        const starknetSnapshot = peerProviders?.getById('starknet')
        const paradexAccounts = paradexAccountStore.getState().paradexAccounts
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
        paradexAccountStore.subscribe(sync),
        useParadexActiveStore.subscribe(sync),
    ]
    if (peerProviders) {
        unsubs.push(peerProviders.subscribe(sync))
    }

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
