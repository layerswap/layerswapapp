import TonConnect from '@tonconnect/sdk'
import type { TonClientConfig } from './index'
import { getTonConnect, hasTonConnect, setTonApiKey, setTonConnect } from './service/getTonConnect'
import { attachTonSync } from './service/syncTon'

let _initialized = false

type InitOptions = {
    tonConfigs?: TonClientConfig
}

/**
 * One-shot initialization of the TonConnect headless SDK + store sync.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initTonProvider(opts: InitOptions = {}): void {
    if (_initialized) return

    const { tonConfigs } = opts

    setTonApiKey(tonConfigs?.tonApiKey)

    // SDK construction and the wallet-list fetch are browser-only. On the
    // server, the store stays at its initial (ready: false, wallets: []) state
    // so server-rendered HTML matches the client's first paint and hydration
    // does not mismatch.
    if (typeof window === 'undefined') return

    if (hasTonConnect()) {
        attachTonSync(getTonConnect())
        _initialized = true
        return
    }

    const tonConnect = new TonConnect({
        manifestUrl: tonConfigs?.manifestUrl,
    })
    setTonConnect(tonConnect)
    attachTonSync(tonConnect)

    // Restore an existing session if one is in localStorage. Mirrors the
    // old <TonConnectUIProvider> behavior. Errors are swallowed (e.g. expired
    // session) — onStatusChange fires once the wallet reconnects.
    tonConnect.restoreConnection().catch(() => { /* swallow */ })

    _initialized = true
}

/** Visible for tests. Resets the singleton init flag so a fresh init can run. */
export function _resetTonInit(): void {
    _initialized = false
}
