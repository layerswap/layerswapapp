import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useTronTransfer } from '../transferProvider/useTronTransfer'
import { tronConnectionService } from './TronConnectionService'
import { useTronStore } from './tronStore'

export function useTronConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    tronConnectionService.setNetworks(networks)

    const { wallets, activeWalletName, activeAddress, ready } = useTronStore(
        s => ({
            wallets: s.wallets,
            activeWalletName: s.activeWalletName,
            activeAddress: s.activeAddress,
            ready: s.ready,
        }),
        shallow,
    )

    const { executeTransfer: transfer } = useTronTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...tronConnectionService.buildProvider(),
        transfer,
    }), [wallets, activeWalletName, activeAddress, ready, transfer, networks])
}

export default useTronConnection
