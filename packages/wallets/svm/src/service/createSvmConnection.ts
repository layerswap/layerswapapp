import type { NetworkWithTokens } from "@layerswap/utils"
import type { MultiStepHandler, WalletConnectionProvider, WalletConnectionProviderProps, WalletConnectionStore } from "@layerswap/wallet-core/types"
import { isMobile } from "@layerswap/utils"
import { connectModalStore, createMemoizedConnectionStore, getAdditionalConnectorsStore } from "@layerswap/wallet-core"
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
                networks,
            }
        },
        buildSnapshot: inputs => {
            // Pass current browse connectors to the service via configure so the
            // build path stays a pure read — no writes to upstream stores from
            // inside getSnapshot (would loop the widget's recompute effect).
            svmConnectionService.configure({ registryConnectors: inputs.browseConnectors })

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
                if (modal.isWalletModalOpen && !additionalConnectorsStore.getSnapshot().browseMetadata.loaded) {
                    additionalConnectorsStore
                        .requestAdditionalConnectors({ page: 1, pageSize: 40 })
                        .catch(error => console.warn('Failed to load Solana WalletConnect wallets registry', error))
                }
                if (modal.isWalletModalOpen) {
                    svmConnectionService.warmUpWalletConnect()
                }
            }),
        ],
        onUpdateProps: nextProps => {
            networks = nextProps.networks
            svmConnectionService.setNetworks(networks)
        },
    })
}
