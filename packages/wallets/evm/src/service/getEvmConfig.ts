import { createConfig, reconnect, type Config, type CreateConnectorFn, type Transport } from '@wagmi/core'
import type { Chain } from 'viem'

export type EvmConfigInitParams = {
    chains: readonly [Chain, ...Chain[]]
    transports: Record<number, Transport>
    connectors: readonly CreateConnectorFn[]
    ssr?: boolean
}

let _config: Config | null = null
let _initParams: EvmConfigInitParams | null = null

export function setEvmConfigInitParams(params: EvmConfigInitParams): void {
    if (_config) return
    _initParams = params
}

export function getEvmConfig(): Config {
    if (_config) return _config
    if (!_initParams) {
        throw new Error('EVM wagmi config requested before setEvmConfigInitParams was called')
    }
    _config = createConfig({
        chains: _initParams.chains,
        transports: _initParams.transports,
        connectors: _initParams.connectors,
        ssr: _initParams.ssr ?? true,
    })
    // Mirrors the old <WagmiProvider reconnectOnMount={true}> behavior so
    // connections restore on page load.
    if (typeof window !== 'undefined') {
        reconnect(_config).catch(() => { /* swallow */ })
    }
    return _config
}

export function hasEvmConfig(): boolean {
    return _config !== null
}
