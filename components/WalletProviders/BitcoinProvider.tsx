import { BigmiProvider } from '@bigmi/react'
import {
    createConfig,
    ctrl,
    leather,
    okx,
    onekey,
    phantom,
    unisat,
    xverse,
} from '@bigmi/client'
import type { Config, CreateConnectorFn } from '@bigmi/client'
import { http, bitcoin, createClient } from '@bigmi/core'

export const BitcoinProvider = ({ children }: { children: JSX.Element | JSX.Element[] }) => {

    const { config } = createDefaultBigmiConfig()

    return (
        <BigmiProvider config={config} reconnectOnMount={true}>
            {children}
        </BigmiProvider>
    )
}

function createDefaultBigmiConfig(): DefaultBigmiConfigResult {
    const btcChainId = 20000000000001

    const connectors: CreateConnectorFn[] = [
        phantom({ chainId: btcChainId }),
        xverse({ chainId: btcChainId }),
        unisat({ chainId: btcChainId }),
        ctrl({ chainId: btcChainId }),
        okx({ chainId: btcChainId }),
        leather({ chainId: btcChainId }),
        onekey({ chainId: btcChainId }),
    ]

    const config = createConfig({
        chains: [bitcoin],
        connectors,
        client({ chain }) {
            return createClient({ chain, transport: http() })
        },
    })

    return {
        config,
        connectors,
    }
}

interface DefaultBigmiConfigResult {
    config: Config
    connectors: CreateConnectorFn[]
}