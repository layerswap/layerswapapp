'use client'
// Shared pieces between the slim shell entry (index.tsx) and the legacy
// factory (legacy.tsx). Kept separate so that pulling these in for the
// shell does NOT drag in useEVMConnection / useEVMTransfer / etc.
import { ComponentProps, createContext, lazy, useContext } from 'react'
import type { BaseWalletProviderConfig, WalletProviderModule } from '@layerswap/widget/types'

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type EVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
    walletProviderModules?: WalletProviderModule[]
}

export const WalletConnectConfigContext = createContext<WalletConnectConfig | null>(null)
export const useWalletConnectConfig = () => useContext(WalletConnectConfigContext)

// EVMProvider (WagmiProvider wrapper) is itself lazy. The sync-when-cached
// pattern lets it render synchronously after the chunk has loaded once —
// no extra Suspense flicker on hot navigations.
let EVMProviderImpl: typeof import('./EVMProvider')['default'] | null = null

const loadEVMProviderModule = async () => {
    const m = await import('./EVMProvider')
    EVMProviderImpl = m.default
}

const EVMProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import('./EVMProvider')
    EVMProviderImpl = m.default
    return m
})

export const EVMProviderWrapper = (props: ComponentProps<typeof EVMProviderWrapperLazy>) => {
    if (EVMProviderImpl) {
        const Impl = EVMProviderImpl
        return <Impl {...props} />
    }
    return <EVMProviderWrapperLazy {...props} />
}

export const preloadEVMProvider = loadEVMProviderModule
