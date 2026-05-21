import { useEffect, useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { isMobile, useAdditionalConnectors, useConnectModal } from '@layerswap/widget/internal'
import { ethereumNames, id as PROVIDER_ID, name as PROVIDER_NAME } from '../constants'
import { createEvmTransfer } from '../transferProvider/createEvmTransfer'
import { useWalletConnectConfig } from '..'
import { evmConnectionService } from './EvmConnectionService'
import { useEvmStore } from './evmStore'

const EVM_NS = 'eip155'

export function useEvmConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    const isMobilePlatform = useMemo(() => isMobile(), [])
    evmConnectionService.setNetworks(networks)

    const { setSelectedConnector, isWalletModalOpen } = useConnectModal()
    const walletConnectConfig = useWalletConnectConfig()
    const {
        browseConnectors: walletConnectConnectors,
        browseMetadata: walletConnectBrowseMetadata,
        requestAdditionalConnectors: requestRegistryConnectors,
        addRecentConnector: addWalletConnectWallet,
    } = useAdditionalConnectors(EVM_NS, walletConnectConfig?.projectId)

    evmConnectionService.configure({
        setSelectedConnector,
        addRecentConnector: addWalletConnectWallet,
        requestRegistryConnectors,
        registryConnectors: walletConnectConnectors,
        isMobilePlatform,
    })

    useEffect(() => {
        if (isWalletModalOpen && !walletConnectBrowseMetadata.loaded) {
            requestRegistryConnectors({ page: 1, pageSize: 40 }).catch((error) =>
                console.warn('Failed to load WalletConnect wallets registry', error),
            )
        }
    }, [isWalletModalOpen, walletConnectBrowseMetadata.loaded, requestRegistryConnectors])

    const { allConnectors, connections, wagmiAccount, selectedAddress } = useEvmStore(
        s => ({
            allConnectors: s.allConnectors,
            connections: s.connections,
            wagmiAccount: s.wagmiAccount,
            selectedAddress: s.selectedAddress,
        }),
        shallow,
    )

    const activeConnection = useMemo(() => {
        const isSelectedAddressActive = !!selectedAddress
            && !!wagmiAccount.addresses
            && wagmiAccount.addresses.some(addr => addr === selectedAddress)
        const id = wagmiAccount.connectorId
        const address = isSelectedAddressActive ? selectedAddress : wagmiAccount.address
        if (!id || !address) return undefined
        return { id, address }
    }, [wagmiAccount, selectedAddress])

    const connectedWallets = useMemo(
        () => evmConnectionService.getConnectedWallets(connections, activeConnection),
        [connections, activeConnection, networks, walletConnectConnectors],
    )

    const activeWallet = useMemo(
        () => evmConnectionService.getActiveWallet(connectedWallets),
        [connectedWallets],
    )

    const availableConnectors = useMemo(
        () => evmConnectionService.getAvailableConnectors(allConnectors),
        [allConnectors, walletConnectConnectors, isMobilePlatform],
    )

    const additionalConnectors = useMemo(
        () => evmConnectionService.getAdditionalConnectors(allConnectors),
        [allConnectors, walletConnectConnectors, isMobilePlatform],
    )

    const providerIcon = useMemo(
        () => networks.find(n => ethereumNames.some(name => name === n.name))?.logo,
        [networks],
    )

    const transferProvider = useMemo(() => createEvmTransfer(), [])
    const transfer = transferProvider.executeTransfer

    const ready = evmConnectionService.getReady(allConnectors)
    const buckets = evmConnectionService.getBuckets()

    return useMemo<WalletConnectionProvider>(() => ({
        connectWallet: evmConnectionService.connectWallet.bind(evmConnectionService),
        disconnectWallets: evmConnectionService.disconnectWallets.bind(evmConnectionService),
        switchAccount: evmConnectionService.switchAccount.bind(evmConnectionService),
        switchChain: evmConnectionService.switchChain.bind(evmConnectionService),
        isNotAvailableCondition: evmConnectionService.isNotAvailable.bind(evmConnectionService),
        requestAdditionalConnectors: evmConnectionService.requestAdditionalConnectors.bind(evmConnectionService),

        transfer,

        connectedWallets,
        activeWallet,
        autofillSupportedNetworks: buckets.autofill,
        withdrawalSupportedNetworks: buckets.withdrawal,
        asSourceSupportedNetworks: buckets.asSource,
        availableConnectors,
        additionalConnectors,
        name: PROVIDER_NAME,
        id: PROVIDER_ID,
        providerIcon,
        ready,
    }), [
        transfer,
        connectedWallets,
        activeWallet,
        buckets,
        availableConnectors,
        additionalConnectors,
        providerIcon,
        ready,
    ])
}

export default useEvmConnection
