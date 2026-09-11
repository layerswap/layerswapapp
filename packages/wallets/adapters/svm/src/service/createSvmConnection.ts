import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore, WalletModalConnector } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { connectModalStore, createMemoizedConnectionStore, getAdditionalConnectorsStore } from "@layerswap/wallet-core"
import { id as PROVIDER_ID } from '../constants'
import { createSvmTransfer } from '../transferProvider/createSvmTransfer'
import { getWalletConnectConfig } from './walletConnectConfig'
import { SvmConnectionService } from './SvmConnectionService'
import { useSvmStore } from './svmStore'

const SVM_NS = PROVIDER_ID

type CreateSvmConnectionOptions = {
    extraMultiStepHandlers?: MultiStepHandler[]
}

/**
 * Vanilla external-store factory for the Solana wallet connection. Replaces
 * the old `useSvmConnection` hook.
 */
export function createSvmConnection<Network>(
    initialProps: WalletConnectionProviderProps<Network>,
    options: CreateSvmConnectionOptions = {},
): WalletConnectionStore<Network> {
    const { extraMultiStepHandlers = [] } = options
    const isMobilePlatform = isMobile()

    let networks = initialProps.networks
    let networkAdapter = initialProps.networkAdapter
    const svmConnectionService = new SvmConnectionService<Network>()
    svmConnectionService.setNetworks(networks, networkAdapter)

    const walletConnectConfig = getWalletConnectConfig()
    const additionalConnectorsStore = getAdditionalConnectorsStore(
        SVM_NS,
        walletConnectConfig?.projectId,
    )

    svmConnectionService.configure({
        setSelectedConnector: connectModalStore.setSelectedConnector,
        getSelectedConnector: () => connectModalStore.getSnapshot().selectedConnector as WalletModalConnector | undefined,
        addRecentConnector: additionalConnectorsStore.addRecentConnector,
        requestRegistryConnectors: additionalConnectorsStore.requestAdditionalConnectors,
        registryConnectors: additionalConnectorsStore.getSnapshot().browseConnectors,
        recentConnectors: additionalConnectorsStore.getSnapshot().recentConnectors,
        isMobilePlatform,
    })

    const transferProvider = createSvmTransfer()
    const transfer = transferProvider.executeTransfer

    return createMemoizedConnectionStore({
        computeInputs: () => {
            const svm = useSvmStore.getState()
            const additional = additionalConnectorsStore.getSnapshot()
            return {
                wallets: svm.wallets,
                activeWalletName: svm.activeWalletName,
                activeAddress: svm.activeAddress,
                ready: svm.ready,
                browseConnectors: additional.browseConnectors,
                recentConnectors: additional.recentConnectors,
                networks,
            }
        },
        buildSnapshot: inputs => {
            // Pass current browse connectors to the service via configure so the
            // build path stays a pure read — no writes to upstream stores from
            // inside getSnapshot (would loop the widget's recompute effect).
            svmConnectionService.configure({
                registryConnectors: inputs.browseConnectors,
                recentConnectors: inputs.recentConnectors,
            })

            return {
                ...svmConnectionService.buildProvider(),
                transfer,
                multiStepHandlers: extraMultiStepHandlers,
            }
        },
        subscribe: sync => [
            useSvmStore.subscribe(sync),
            additionalConnectorsStore.subscribe(sync),
            connectModalStore.subscribe(() => {
                const modal = connectModalStore.getSnapshot()
                if (modal.isWalletModalOpen) {
                    // Deduped + status-tracked (loading/error) so the widget's
                    // settle gate and loading tail observe this fetch.
                    void additionalConnectorsStore.ensureBrowseLoaded()
                    svmConnectionService.warmUpWalletConnect()
                }
            }),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            networkAdapter = nextProps.networkAdapter
            svmConnectionService.setNetworks(networks, networkAdapter)
        },
    })
}
