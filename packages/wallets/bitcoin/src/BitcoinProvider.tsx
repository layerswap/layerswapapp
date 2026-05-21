import { BigmiProvider } from '@bigmi/react'
import { NetworkType } from '@layerswap/widget/types'
import { useSettingsState } from '@layerswap/widget/internal'
import { ReactNode, useContext, useMemo } from 'react'
import type { ReactElement } from 'react'
import { QueryClient, QueryClientContext, QueryClientProvider } from '@tanstack/react-query'
import { ensureBitcoinConfig, getBitcoinConfig, hasBitcoinConfig } from './service/getBitcoinConfig'
import { attachBitcoinSync } from './service/syncBitcoin'
import { useBitcoinStore } from './service/bitcoinStore'

export const BitcoinProvider = ({ children }: { children: ReactNode }): ReactElement => {
    const { networks } = useSettingsState()
    const network = networks.find(n => n.type === NetworkType.Bitcoin)

    const config = useMemo(() => {
        const c = ensureBitcoinConfig(network)
        attachBitcoinSync(c)
        return c
    }, [])

    return (
        <BigmiProvider config={config} reconnectOnMount={true}>
            <QueryWrapper>
                {children}
            </QueryWrapper>
        </BigmiProvider>
    )
}

const queryClient = new QueryClient()

const QueryWrapper = ({ children }: { children: ReactNode }): ReactElement => {
    const context = useContext(QueryClientContext)
    if (context) {
        return <>{children}</>
    }
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

export function useBitcoinConnectors() {
    if (!hasBitcoinConfig()) {
        throw new Error('useBitcoinConnectors must be used within a BitcoinProvider')
    }
    return { connectors: useBitcoinStore(s => s.resolvedConnectors) }
}

// Re-export so callers that only need the config can import from here.
export { getBitcoinConfig }
