import type { NetworkWithTokens } from '@layerswap/widget/types'
import { NetworkType } from '@layerswap/widget/types'
import { ensureBitcoinConfig, hasBitcoinConfig } from './service/getBitcoinConfig'
import { attachBitcoinSync } from './service/syncBitcoin'

let _initialized = false

type InitOptions = {
    networks: NetworkWithTokens[]
}

/**
 * One-shot initialization of the Bitcoin client config + store sync.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function initBitcoinProvider(opts: InitOptions): void {
    if (_initialized) return
    if (typeof window === 'undefined') return

    const network = opts.networks.find(n => n.type === NetworkType.Bitcoin)
    const config = ensureBitcoinConfig(network)
    attachBitcoinSync(config)
    _initialized = true
}

export function hasBitcoinInit(): boolean {
    return _initialized && hasBitcoinConfig()
}

/** Visible for tests. Resets the singleton init so a fresh init can run. */
export function _resetBitcoinInit(): void {
    _initialized = false
}
