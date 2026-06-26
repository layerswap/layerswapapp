import type {
    MultiStepHandler,
    NetworkWithTokens,
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    WalletConnectionStore,
} from '@layerswap/widget/types'
import {
    connectModalStore,
    getAdditionalConnectorsStore,
    isMobile,
} from '@layerswap/widget/internal'
import { createStore } from 'zustand/vanilla'
import { id as PROVIDER_ID } from '../constants'
import { createSvmTransfer } from '../transferProvider/createSvmTransfer'
import { getWalletConnectConfig } from './walletConnectConfig'
import { svmConnectionService } from './SvmConnectionService'
import { useSvmStore } from './svmStore'

const SVM_NS = PROVIDER_ID

type CreateSvmConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Solana wallet connection. Replaces
 * the old `useSvmConnection` hook.
 */
export function createSvmConnection(
    initialProps: WalletConnectionProviderProps,
    options: CreateSvmConnectionOptions = {},
): WalletConnectionStore {
    const { extraMultiStepHandlers = [] } = options
    const isMobilePlatform = isMobile()

    let networks: NetworkWithTokens[] = initialProps.networks
    svmConnectionService.setNetworks(networks)

    const walletConnectConfig = getWalletConnectConfig()
    const additionalConnectorsStore = getAdditionalConnectorsStore(
        SVM_NS,
        walletConnectConfig?.projectId,
    )

    svmConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        getSelectedConnector: () => connectModalStore.getSnapshot().selectedConnector,
        addRecentConnector: additionalConnectorsStore.addRecentConnector,
        requestRegistryConnectors: additionalConnectorsStore.requestAdditionalConnectors,
        isMobilePlatform,
    })

    const transferProvider = createSvmTransfer()
    const transfer = transferProvider.executeTransfer

    type SnapshotInputs = {
        wallets: unknown
        activeWalletName: unknown
        activeAddress: unknown
        ready: unknown
        browseConnectors: unknown
        networks: NetworkWithTokens[]
    }
    let lastInputs: SnapshotInputs | null = null
    let lastSnapshot: WalletConnectionProvider | null = null

    const computeSnapshot = (): WalletConnectionProvider => {
        const svm = useSvmStore.getState()
        const additional = additionalConnectorsStore.getSnapshot()
        const inputs: SnapshotInputs = {
            wallets: svm.wallets,
            activeWalletName: svm.activeWalletName,
            activeAddress: svm.activeAddress,
            ready: svm.ready,
            browseConnectors: additional.browseConnectors,
            networks,
        }
        if (lastInputs
            && lastInputs.wallets === inputs.wallets
            && lastInputs.activeWalletName === inputs.activeWalletName
            && lastInputs.activeAddress === inputs.activeAddress
            && lastInputs.ready === inputs.ready
            && lastInputs.browseConnectors === inputs.browseConnectors
            && lastInputs.networks === inputs.networks
            && lastSnapshot) {
            return lastSnapshot
        }

        // Pass current browse connectors to the service via configure so the
        // build path stays a pure read — no writes to upstream stores from
        // inside getSnapshot (would loop the widget's recompute effect).
        svmConnectionService.configure({ registryConnectors: additional.browseConnectors })

        const snapshot: WalletConnectionProvider = {
            ...svmConnectionService.buildProvider(),
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
        useSvmStore.subscribe(sync),
        additionalConnectorsStore.subscribe(sync),
        connectModalStore.subscribe(() => {
            const modal = connectModalStore.getSnapshot()
            if (modal.isWalletModalOpen && !additionalConnectorsStore.getSnapshot().browseMetadata.loaded) {
                additionalConnectorsStore
                    .requestAdditionalConnectors({ page: 1, pageSize: 40 })
                    .catch(error => console.warn('Failed to load Solana WalletConnect wallets registry', error))
            }
            if (modal.isWalletModalOpen) {
                svmConnectionService.warmUpWalletConnect()
            }
        }),
    ]

    return {
        store,
        updateProps(nextProps) {
            networks = nextProps.networks
            svmConnectionService.setNetworks(networks)
            sync()
        },
        destroy() {
            unsubs.forEach(u => u())
        },
    }
}
