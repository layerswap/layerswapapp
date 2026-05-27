import type { TonConnect } from '@tonconnect/sdk'
import { snapshotFromTonWallet, useTonStore } from './tonStore'

let _attached = false
let _dispose: (() => void) | null = null

export function attachTonSync(tonConnect: TonConnect): () => void {
    if (_attached) return _dispose ?? (() => { })
    _attached = true

    useTonStore.getState()._setTonWallet(snapshotFromTonWallet(tonConnect.wallet))

    const unsubscribeStatus = tonConnect.onStatusChange((wallet) => {
        useTonStore.getState()._setTonWallet(snapshotFromTonWallet(wallet))
    })

    // Discover the wallet registry (TonConnect's hosted list) and mirror it
    // into the store so getAvailableConnectors() can read synchronously.
    tonConnect.getWallets()
        .then((wallets) => {
            useTonStore.getState()._setWallets(wallets)
            useTonStore.getState()._setReady(true)
        })
        .catch(() => {
            useTonStore.getState()._setReady(true)
        })

    _dispose = () => {
        unsubscribeStatus()
        useTonStore.getState()._setReady(false)
        _attached = false
        _dispose = null
    }
    return _dispose
}

export function isTonSyncAttached(): boolean {
    return _attached
}
