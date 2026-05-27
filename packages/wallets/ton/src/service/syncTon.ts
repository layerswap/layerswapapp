import type { TonConnect } from '@tonconnect/sdk'
import { snapshotFromTonWallet, useTonStore } from './tonStore'

let _attached = false
let _dispose: (() => void) | null = null
let _tonConnect: TonConnect | null = null

export function attachTonSync(tonConnect: TonConnect): () => void {
    if (_tonConnect === tonConnect && _dispose) return _dispose
    _dispose?.()

    useTonStore.getState()._setTonWallet(snapshotFromTonWallet(tonConnect.wallet))

    const unsubscribeStatus = tonConnect.onStatusChange((wallet) => {
        useTonStore.getState()._setTonWallet(snapshotFromTonWallet(wallet))
    })

    let disposed = false
    const dispose = () => {
        if (disposed) return
        disposed = true
        unsubscribeStatus()
        if (_dispose !== dispose) return
        useTonStore.getState()._setReady(false)
        _attached = false
        _dispose = null
        _tonConnect = null
    }
    _attached = true
    _tonConnect = tonConnect
    _dispose = dispose

    // Discover the wallet registry (TonConnect's hosted list) and mirror it
    // into the store so getAvailableConnectors() can read synchronously.
    try {
        tonConnect.getWallets()
            .then((wallets) => {
                if (_tonConnect !== tonConnect) return
                useTonStore.getState()._setWallets(wallets)
                useTonStore.getState()._setReady(true)
            })
            .catch(() => {
                if (_tonConnect !== tonConnect) return
                useTonStore.getState()._setReady(true)
            })
    } catch (error) {
        dispose()
        throw error
    }

    return _dispose
}

export function isTonSyncAttached(): boolean {
    return _attached
}
