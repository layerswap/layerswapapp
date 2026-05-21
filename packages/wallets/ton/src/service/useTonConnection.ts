import { useMemo } from 'react'
import { shallow } from 'zustand/shallow'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
} from '@layerswap/widget/types'
import { useTONTransfer } from '../transferProvider/useTONTransfer'
import { tonConnectionService } from './TonConnectionService'
import { useTonStore } from './tonStore'

export function useTonConnection({ networks }: WalletConnectionProviderProps): WalletConnectionProvider {
    tonConnectionService.setNetworks(networks)

    const { tonWallet, ready } = useTonStore(
        s => ({ tonWallet: s.tonWallet, ready: s.ready }),
        shallow,
    )

    const { executeTransfer: transfer } = useTONTransfer()

    return useMemo<WalletConnectionProvider>(() => ({
        ...tonConnectionService.buildProvider(tonWallet),
        transfer,
        ready,
    }), [tonWallet, ready, transfer, networks])
}

export default useTonConnection
