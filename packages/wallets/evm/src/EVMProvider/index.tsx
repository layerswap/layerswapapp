import { useSettingsState } from "@layerswap/widget/internal"
import { useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { WagmiContext } from 'wagmi'
import type { Config } from '@wagmi/core'
import { useChainConfigs } from '../evmUtils/chainConfigs'
import { useWalletConnectConfig } from '../index'
import { HIDDEN_WALLETCONNECT_ID } from "../constants"
import { useEVMConnectors } from './Connectors'
import {
    getEvmConfig,
    hasEvmConfig,
    provideExternalEvmConfig,
    setEvmConfigInitParams,
} from '../service/getEvmConfig'
import { attachWagmiSync } from '../service/syncWagmi'

type Props = {
    children: ReactNode
    /**
     * Optional externally-created wagmi Config. When provided (or when the
     * EVMHydrator is rendered under a host <WagmiProvider>), the EVM package
     * adopts it instead of creating its own.
     */
    wagmiConfig?: Config | null
}

const DEFAULT_WC_CONFIG = {
    projectId: '6113382c2e587bff00e2b5c3d68531f3',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://www.layerswap.app',
    icons: ['https://www.layerswap.app/favicon.ico'],
}

function EVMHydrator({ children, wagmiConfig }: Props) {
    const settings = useSettingsState()
    const walletConnectConfigs = useWalletConnectConfig() ?? DEFAULT_WC_CONFIG

    // Hooks must run unconditionally — the values are only consumed in the
    // internal-config path below.
    const { chains, transports } = useChainConfigs(settings?.networks)
    const defaultConnectors = useEVMConnectors(HIDDEN_WALLETCONNECT_ID, walletConnectConfigs)

    // Implicit fallback: if the host wraps us in <WagmiProvider>, adopt its
    // config. Explicit prop takes precedence.
    const ambientConfig = useContext(WagmiContext) ?? null
    const externalConfig = wagmiConfig ?? ambientConfig

    // Initialize the module-scoped config + watchers exactly once. Re-renders
    // of this component (including lazy-load remounts) are no-ops.
    useMemo(() => {
        if (hasEvmConfig()) {
            attachWagmiSync(getEvmConfig())
            return
        }
        if (externalConfig) {
            provideExternalEvmConfig(externalConfig)
            attachWagmiSync(externalConfig)
            return
        }
        setEvmConfigInitParams({
            chains,
            transports,
            connectors: [...defaultConnectors],
            ssr: true,
        })
        attachWagmiSync(getEvmConfig())
    }, [])

    return <>{children}</>
}

export default EVMHydrator
