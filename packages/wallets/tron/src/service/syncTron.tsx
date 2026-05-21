import { useEffect } from 'react'
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks'
import { setTronAdapterApi } from './getTronAdapter'
import { snapshotFromTronWallet, useTronStore } from './tronStore'

export function TronSync(): null {
    const { wallets, wallet, select, connect, disconnect } = useWallet()

    useEffect(() => {
        setTronAdapterApi({ select, connect, disconnect })
        return () => setTronAdapterApi(null)
    }, [select, connect, disconnect])

    useEffect(() => {
        useTronStore.getState()._setWallets(wallets.map(snapshotFromTronWallet))
    }, [wallets])

    useEffect(() => {
        if (!wallet) {
            useTronStore.getState()._setActive(undefined, undefined)
            return
        }
        useTronStore.getState()._setActive(
            wallet.adapter.name,
            wallet.adapter.address || undefined,
        )
    }, [wallet, wallet?.adapter.address, wallet?.adapter.connected])

    return null
}
