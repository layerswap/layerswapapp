import type { TonConnectUI } from '@tonconnect/ui-react'
import { snapshotFromTonWallet, useTonStore } from './tonStore'

let _attached = false
let _dispose: (() => void) | null = null

export function attachTonSync(tonConnectUI: TonConnectUI): () => void {
    if (_attached) return _dispose ?? (() => { })
    _attached = true

    const store = useTonStore.getState()
    store._setTonWallet(snapshotFromTonWallet(tonConnectUI.wallet))
    store._setReady(true)

    const unsubscribeStatus = tonConnectUI.onStatusChange((wallet) => {
        useTonStore.getState()._setTonWallet(snapshotFromTonWallet(wallet))
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
