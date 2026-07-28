import type { Config } from '@wagmi/core'
import type { Network } from '@layerswap/widget/types'
import { getEvmChainsConfig } from '../evmUtils/chainConfigs'
import { buildEVMConnectors } from './Connectors'
import {
    getEvmConfig,
    hasEvmConfig,
    provideExternalEvmConfig,
    setEvmConfigInitParams,
} from '../service/getEvmConfig'
import { attachWagmiSync } from '../service/syncWagmi'
import type { WalletConnectConfig } from '../types'

const DEFAULT_WC_CONFIG: WalletConnectConfig = {
    projectId: '6113382c2e587bff00e2b5c3d68531f3',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://www.layerswap.app',
    icons: ['https://www.layerswap.app/favicon.ico'],
}

type InitOptions = {
    networks: Network[]
    walletConnectConfigs?: WalletConnectConfig
    /**
     * Optionally adopt an externally-created wagmi Config (e.g. the host
     * app already mounts `<WagmiProvider>`). When omitted, EVM creates its
     * own config from `networks` + default connectors.
     */
    externalWagmiConfig?: Config | null
}

let _initialized = false

/**
 * One-shot initialization of the EVM wagmi config and store sync. Safe to
 * call multiple times — subsequent calls are no-ops.
 */
export function initEvmProvider(opts: InitOptions): void {
    const { networks, walletConnectConfigs = DEFAULT_WC_CONFIG, externalWagmiConfig } = opts

    if (_initialized) {
        // Never drop a host config silently: provideExternalEvmConfig warns
        // when a different config is already live.
        if (externalWagmiConfig) provideExternalEvmConfig(externalWagmiConfig)
        return
    }

    if (externalWagmiConfig) {
        // Must run before the hasEvmConfig() check — if something already
        // created the internal config (e.g. an early getEvmConfig() call),
        // provideExternalEvmConfig warns instead of adopting, and we attach
        // to whichever config is actually live so there is exactly one
        // synced wagmi state.
        provideExternalEvmConfig(externalWagmiConfig)
        attachWagmiSync(getEvmConfig())
        _initialized = true
        return
    }

    if (hasEvmConfig()) {
        attachWagmiSync(getEvmConfig())
        _initialized = true
        return
    }

    const { chains, transports } = getEvmChainsConfig(networks)
    const connectors = buildEVMConnectors(walletConnectConfigs)

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
