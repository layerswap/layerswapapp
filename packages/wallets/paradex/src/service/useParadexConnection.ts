import { useMemo } from 'react'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useWalletStore, useConnectModal } from '@layerswap/widget/internal'
import { useActiveParadexAccount } from '../ActiveParadexAccount'
import ParadexMultiStepHandler from '../components/ParadexMultiStepHandler'
import {
    asSourceSupportedNetworks,
    autofillSupportedNetworks,
    id,
    name,
    paradexConnectionService,
    withdrawalSupportedNetworks,
} from './ParadexConnectionService'

export function useParadexConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    paradexConnectionService.setNetworks(networks)

    const { activeConnection, setActiveAddress, evmProvider: evmProviderInstance, starknetProvider: starknetProviderInstance } = useActiveParadexAccount()
    const paradexAccounts = useWalletStore((state) => state.paradexAccounts)
    const addParadexAccount = useWalletStore((state) => state.addParadexAccount)
    const removeParadexAccount = useWalletStore((state) => state.removeParadexAccount)
    const { setSelectedConnector } = useConnectModal()

    const evmProvider = evmProviderInstance.walletConnectionProvider({ networks })
    const starknetProvider = starknetProviderInstance.walletConnectionProvider({ networks })

    paradexConnectionService.configure({
        evmProvider,
        starknetProvider,
        activeConnection,
        setActiveAddress,
        paradexAccounts,
        addParadexAccount,
        removeParadexAccount,
        setSelectedConnector,
    })

    const connectedWallets = useMemo(
        () => paradexConnectionService.getConnectedWallets(),
        [evmProvider, starknetProvider, paradexAccounts, networks],
    )

    const availableConnectors = useMemo(
        () => paradexConnectionService.getAvailableConnectors(),
        [evmProvider, starknetProvider],
    )

    const additionalConnectors = useMemo(
        () => paradexConnectionService.getAdditionalConnectors(),
        [evmProvider.additionalConnectors],
    )

    const activeWallet = useMemo(
        () => paradexConnectionService.getActiveWallet(),
        [evmProvider.activeWallet, starknetProvider.activeWallet, activeConnection, paradexAccounts, networks],
    )

    return useMemo<WalletConnectionProvider>(() => ({
        connectWallet: paradexConnectionService.connectWallet.bind(paradexConnectionService),
        switchAccount: paradexConnectionService.switchAccount.bind(paradexConnectionService),
        requestAdditionalConnectors: paradexConnectionService.requestAdditionalConnectors.bind(paradexConnectionService),

        connectedWallets,
        activeWallet,
        availableConnectors,
        additionalConnectors,

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
    }), [connectedWallets, activeWallet, availableConnectors, additionalConnectors, evmProvider, starknetProvider, networks])
}

export default useParadexConnection
