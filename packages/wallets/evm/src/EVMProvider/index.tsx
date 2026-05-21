import { useSettingsState } from "@layerswap/widget/internal"
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useChainConfigs } from '../evmUtils/chainConfigs'
import { useWalletConnectConfig } from '../index'
import { HIDDEN_WALLETCONNECT_ID } from "../constants"
import { useEVMConnectors } from './Connectors'
import { getEvmConfig, setEvmConfigInitParams } from '../service/getEvmConfig'
import { attachWagmiSync } from '../service/syncWagmi'

type Props = {
    children: ReactNode
}

const DEFAULT_WC_CONFIG = {
    projectId: '6113382c2e587bff00e2b5c3d68531f3',
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://www.layerswap.app',
    icons: ['https://www.layerswap.app/favicon.ico'],
}

function EVMHydrator({ children }: Props) {
    const settings = useSettingsState()
    const walletConnectConfigs = useWalletConnectConfig() ?? DEFAULT_WC_CONFIG

    const { chains, transports } = useChainConfigs(settings?.networks)
    const defaultConnectors = useEVMConnectors(HIDDEN_WALLETCONNECT_ID, walletConnectConfigs)

    // Initialize the module-scoped config + watchers exactly once. Re-renders
    // of this component (including lazy-load remounts) are no-ops.
    useMemo(() => {
        setEvmConfigInitParams({
            chains,
            transports,
            connectors: [...defaultConnectors],
            ssr: true,
        })
        const cfg = getEvmConfig()
        attachWagmiSync(cfg)
        return cfg
    }, [])

    return <>{children}</>
}

export default EVMHydrator
