import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useStarknetTransfer } from '../useStarknetTransfer'
import { starknetConnectionService } from './StarknetConnectionService'
import { useStarknetStore } from './starknetStore'

export function useStarknetConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    starknetConnectionService.setNetworks(networks)

    const {
        connectedWallets,
        activeWalletAddress,
        connectors,
        ready,
    } = useStarknetStore(
        s => ({
            connectedWallets: s.connectedWallets,
            activeWalletAddress: s.activeWalletAddress,
            connectors: s.connectors,
            ready: s.ready,
        }),
        shallow,
    )

    const { executeTransfer: transfer } = useStarknetTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...starknetConnectionService.buildProvider(),
        transfer,
    }), [connectedWallets, activeWalletAddress, connectors, ready, transfer, networks])
}

export default useStarknetConnection
