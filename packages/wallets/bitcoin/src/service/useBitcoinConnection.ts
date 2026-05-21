import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useConnectModal } from '@layerswap/widget/internal'
import { useBitcoinTransfer } from '../transferProvider/useBitcoinTransfer'
import { bitcoinConnectionService } from './BitcoinConnectionService'
import { useBitcoinStore } from './bitcoinStore'

export function useBitcoinConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    bitcoinConnectionService.setNetworks(networks)

    const { setSelectedConnector } = useConnectModal()
    bitcoinConnectionService.configure({ setSelectedConnector })

    const { account, resolvedConnectors, ready } = useBitcoinStore(
        s => ({
            account: s.account,
            resolvedConnectors: s.resolvedConnectors,
            ready: s.ready,
        }),
        shallow,
    )

    const { executeTransfer: transfer } = useBitcoinTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...bitcoinConnectionService.buildProvider(),
        transfer,
    }), [account, resolvedConnectors, ready, transfer, networks])
}

export default useBitcoinConnection
