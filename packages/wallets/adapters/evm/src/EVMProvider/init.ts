import type { Config } from '@wagmi/core'
import type { Chain, Transport } from 'viem'
import type { AppNetworkAdapter } from "@layerswap/wallet-core"
import { getEvmChainsConfig } from '../evmUtils/chainConfigs'
import { buildEVMConnectors } from './Connectors'
import { getEvmConfig, hasEvmConfig, provideExternalEvmConfig, setEvmConfigInitParams, } from '../service/getEvmConfig'
import { attachWagmiSync } from '../service/syncWagmi'
import type { WalletConnectConfig } from '../types'

const DEFAULT_WC_CONFIG: WalletConnectConfig = {
    projectId: '6113382c2e587bff00e2b5c3d68531f3',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://www.layerswap.app',
    icons: ['https://www.layerswap.app/favicon.ico'],
}

type InitOptions<Network> = {
    networks: Network[]
    networkAdapter: AppNetworkAdapter<Network>
    walletConnectConfigs?: WalletConnectConfig
    externalWagmiConfig?: Config | null
}

let _initialized = false

/**
 * Extend the live wagmi config with any Layerswap EVM chains it is missing.
 *
 * Host apps that hand the widget an external config typically register only
 * the chains their own app uses (often just mainnet), but wagmi connectors
 * refuse to switch/send on a chain absent from `config.chains`
 * (ChainNotConfiguredError) — so without this, "Switch network" fails for
 * every Layerswap network the host didn't list. Layerswap chains are appended
 * after the host's own via wagmi's `_internal.chains` store, so the host's
 * chain order (and default chain) is preserved; transports are added only for
 * chains the host didn't configure. `getClient` resolves chains and
 * transports at call time, so appended entries are picked up. Idempotent.
 */
function syncLayerswapChains<Network>(config: Config, networks: Network[], networkAdapter: AppNetworkAdapter<Network>): void {
    const { chains, transports } = getEvmChainsConfig(networks, networkAdapter)
    const existingIds = new Set(config.chains.map(c => c.id))
    const additions = chains.filter(c => !existingIds.has(c.id))
    if (additions.length === 0) return
    config._internal.chains.setState(current => [...current, ...additions] as [Chain, ...Chain[]])
    // Undefined when the host built the config with `client` instead of
    // `transports` — client-based configs don't need per-chain transports.
    const configTransports = config._internal.transports as Record<number, Transport> | undefined
    if (configTransports) {
        for (const chain of additions) {
            if (!(chain.id in configTransports) && transports[chain.id]) {
                configTransports[chain.id] = transports[chain.id]
            }
        }
    }
}

/**
 * One-shot initialization of the EVM wagmi config and store sync. Safe to
 * call multiple times — subsequent calls are no-ops.
 */
export function initEvmProvider<Network>(opts: InitOptions<Network>): void {
    const { networks, networkAdapter, walletConnectConfigs, externalWagmiConfig } = opts
    const resolvedWalletConnectConfigs = walletConnectConfigs?.projectId ? walletConnectConfigs : DEFAULT_WC_CONFIG

    if (_initialized) {
        // Never drop a host config silently: provideExternalEvmConfig warns
        // when a different config is already live.
        if (externalWagmiConfig) {
            provideExternalEvmConfig(externalWagmiConfig)
            syncLayerswapChains(getEvmConfig(), networks, networkAdapter)
        }
        return
    }

    if (externalWagmiConfig) {
        // Must run before the hasEvmConfig() check — if something already
        // created the internal config (e.g. an early getEvmConfig() call),
        // provideExternalEvmConfig warns instead of adopting, and we attach
        // to whichever config is actually live so there is exactly one
        // synced wagmi state.
        provideExternalEvmConfig(externalWagmiConfig)
        syncLayerswapChains(getEvmConfig(), networks, networkAdapter)
        attachWagmiSync(getEvmConfig())
        _initialized = true
        return
    }

    if (hasEvmConfig()) {
        attachWagmiSync(getEvmConfig())
        _initialized = true
        return
    }

    const { chains, transports } = getEvmChainsConfig(networks, networkAdapter)
    const connectors = buildEVMConnectors(resolvedWalletConnectConfigs)

    setEvmConfigInitParams({
        chains,
        transports,
        connectors: [...connectors],
        ssr: true,
    })
    attachWagmiSync(getEvmConfig())
    _initialized = true
}

/** Visible for tests. Resets the singleton init flag so a fresh init can run. */
export function _resetEvmInit(): void {
    _initialized = false
}
