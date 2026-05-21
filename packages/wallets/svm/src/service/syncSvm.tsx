import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { setSvmAdapterApi } from './getSvmAdapter'
import { snapshotFromSvmWallet, useSvmStore } from './svmStore'

export function SvmSync(): null {
    const { wallets, wallet, select, disconnect } = useWallet()
    const walletsRef = useRef(wallets)
    walletsRef.current = wallets

    useEffect(() => {
        setSvmAdapterApi({
            select: (name) => select(name as any),
            disconnect,
            getWallets: () => walletsRef.current,
        })
        return () => setSvmAdapterApi(null)
    }, [select, disconnect])

    useEffect(() => {
        useSvmStore.getState()._setWallets(wallets.map(snapshotFromSvmWallet))
    }, [wallets])

    useEffect(() => {
        if (!wallet) {
            useSvmStore.getState()._setActive(undefined, undefined)
            return
        }
        useSvmStore.getState()._setActive(
            wallet.adapter.name,
            wallet.adapter.publicKey?.toBase58(),
        )
    }, [wallet, wallet?.adapter.connected, wallet?.adapter.publicKey])

    return null
}
