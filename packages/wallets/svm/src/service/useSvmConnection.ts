import { useEffect, useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { isMobile, useAdditionalConnectors, useConnectModal } from '@layerswap/widget/internal'
import { useSVMTransfer } from '../transferProvider/useSVMTransfer'
import { id as PROVIDER_ID } from '../constants'
import { useWalletConnectConfig } from '..'
import { svmConnectionService } from './SvmConnectionService'
import { useSvmStore } from './svmStore'

export function useSvmConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const isMobilePlatform = useMemo(() => isMobile(), [])
    svmConnectionService.setNetworks(networks)

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const walletConnectConfig = useWalletConnectConfig()
    const {
        browseConnectors: walletConnectConnectors,
        browseMetadata: walletConnectBrowseMetadata,
        requestAdditionalConnectors: requestRegistryConnectors,
        addRecentConnector: addWalletConnectWallet,
    } = useAdditionalConnectors(PROVIDER_ID, walletConnectConfig?.projectId)

    svmConnectionService.configure({
        setSelectedConnector,
        addRecentConnector: addWalletConnectWallet,
        requestRegistryConnectors,
        isMobilePlatform,
    })

    useEffect(() => {
        useSvmStore.getState()._setRegistryConnectors(walletConnectConnectors)
    }, [walletConnectConnectors])

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectBrowseMetadata.loaded) {
            requestRegistryConnectors({ page: 1, pageSize: 40 }).catch((error) =>
                console.warn('Failed to load Solana WalletConnect wallets registry', error),
            )
        }
        if (isWalletModalOpen) {
            svmConnectionService.warmUpWalletConnect()
        }
    }, [isWalletModalOpen, walletConnectBrowseMetadata.loaded, requestRegistryConnectors])

    const { wallets, activeWalletName, activeAddress, registryConnectors, ready } = useSvmStore(
        s => ({
            wallets: s.wallets,
            activeWalletName: s.activeWalletName,
            activeAddress: s.activeAddress,
            registryConnectors: s.registryConnectors,
            ready: s.ready,
        }),
        shallow,
    )

    const { executeTransfer: transfer } = useSVMTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...svmConnectionService.buildProvider(),
        transfer,
    }), [wallets, activeWalletName, activeAddress, registryConnectors, ready, isMobilePlatform, transfer, networks])
}

export default useSvmConnection
