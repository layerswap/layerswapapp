import { NetworkType, type LayerswapNetwork } from '@layerswap/widget-types';
import { ensureBitcoinConfig, hasBitcoinConfig, resetBitcoinConfig } from './service/getBitcoinConfig'
import { attachBitcoinSync } from './service/syncBitcoin'

let _initialized = false

type InitOptions<Network extends LayerswapNetwork = LayerswapNetwork> = {
    networks: Network[]
}

export function initBitcoinProvider<Network extends LayerswapNetwork = LayerswapNetwork>(opts: InitOptions<Network>): void {
    if (typeof window === 'undefined') return

    const network = opts.networks.find(item => item.type === NetworkType.Bitcoin)
    const config = ensureBitcoinConfig(network ? {
        id: network.name,
        rpcUrl: (network.nodes?.length ? network.nodes : [network.node_url])[0],
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
