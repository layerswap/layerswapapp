import { createConfig, hydrate, type Config, type CreateConnectorFn, type Transport } from '@wagmi/core'
import type { Chain } from 'viem'

export type EvmConfigInitParams = {
    chains: readonly [Chain, ...Chain[]]
    transports: Record<number, Transport>
    connectors: readonly CreateConnectorFn[]
    ssr?: boolean
}

let _config: Config | null = null
let _initParams: EvmConfigInitParams | null = null
let _external = false

export function setEvmConfigInitParams(params: EvmConfigInitParams): void {
    if (_config) return
    _initParams = params
}

/**
 * Adopt an externally-created wagmi Config (e.g. one already owned by the host
 * app's <WagmiProvider>) instead of having the EVM package create its own.
 *
 * Must be called before getEvmConfig() / EVMHydrator first runs. After the
 * internal config is created, this is a no-op + warning to avoid silent
 * dual-config state.
 */
export function provideExternalEvmConfig(cfg: Config): void {
    if (_config && _config !== cfg) {
        // eslint-disable-next-line no-console
        console.warn('[evm] provideExternalEvmConfig ignored — an EVM config is already in use')
        return
    }
    _config = cfg
    _external = true
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
    // Mirrors the old <WagmiProvider reconnectOnMount={true}> behavior. With
    // `ssr: true`, wagmi defers persist rehydration AND gates EIP-6963 connector
    // discovery on `hasHydrated()` — both seeded initial providers and the mipd
    // subscriber early-return until rehydrate runs. `hydrate(...).onMount()`
    // rehydrates persistence, appends `mipd.getProviders()` into the connector
    // store, and then calls `reconnect(config)`. Skipped for external configs —
    // the host owns this lifecycle for those.
    if (!_external && typeof window !== 'undefined') {
        hydrate(_config, { reconnectOnMount: true }).onMount().catch(() => { /* swallow */ })
    }
    return _config
}

export function hasEvmConfig(): boolean {
    return _config !== null
}

export function isExternalEvmConfig(): boolean {
    return _external
}
