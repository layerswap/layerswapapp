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
import { HIDDEN_WALLETCONNECT_ID } from '../constants'
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
    if (_initialized) return

    const { networks, walletConnectConfigs = DEFAULT_WC_CONFIG, externalWagmiConfig } = opts

    if (hasEvmConfig()) {
        attachWagmiSync(getEvmConfig())
        _initialized = true
        return
    }

    if (externalWagmiConfig) {
        provideExternalEvmConfig(externalWagmiConfig)
        attachWagmiSync(externalWagmiConfig)
        _initialized = true
        return
    }

    const { chains, transports } = getEvmChainsConfig(networks)
    const connectors = buildEVMConnectors(HIDDEN_WALLETCONNECT_ID, walletConnectConfigs)

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
