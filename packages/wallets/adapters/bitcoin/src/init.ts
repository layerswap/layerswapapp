import type { AppNetworkAdapter } from "@layerswap/wallet-core"
import { ensureBitcoinConfig, hasBitcoinConfig, resetBitcoinConfig } from './service/getBitcoinConfig'
import { attachBitcoinSync } from './service/syncBitcoin'

let _initialized = false

type InitOptions<Network> = {
    networks: Network[]
    networkAdapter: AppNetworkAdapter<Network>
}

export function initBitcoinProvider<Network>(opts: InitOptions<Network>): void {
    if (typeof window === 'undefined') return

    const network = opts.networks.find(item => opts.networkAdapter.isBitcoinNetwork(item))
    const config = ensureBitcoinConfig(network ? {
        id: opts.networkAdapter.getId(network),
        rpcUrl: opts.networkAdapter.getRpcUrls(network)[0],
    } : undefined)
    attachBitcoinSync(config)
    _initialized = true
}

export function hasBitcoinInit(): boolean {
    return _initialized && hasBitcoinConfig()
}

/** Visible for tests. Resets the singleton init so a fresh init can run. */
export function _resetBitcoinInit(): void {
    _initialized = false
    resetBitcoinConfig()
}
