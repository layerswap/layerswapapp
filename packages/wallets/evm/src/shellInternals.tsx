'use client'
// Shared pieces between the slim shell entry (index.tsx) and the legacy
// factory (legacy.tsx). Kept separate so that pulling these in for the
// shell does NOT drag in useEVMConnection / useEVMTransfer / etc.
import { createContext, lazy, useContext } from 'react'
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

// EVMProvider (WagmiProvider wrapper) is itself lazy. We render the
// React.lazy reference directly — React.lazy caches its resolved module
// internally, so subsequent renders within the same session do not
// re-suspend. A previous "sync-when-cached" wrapper (return <Impl> after
// load, else return <Lazy>) caused the wrapper subtree to remount when
// the chunk landed: React reconciles by component type, and the type
// would swap from <EVMProviderWrapperLazy> to <EVMProviderImpl> on
// re-render. With 8 chains nested, those type swaps produced visible
// disappear/reappear cycles as chunks landed at different times.
export const EVMProviderWrapper = /*#__PURE__*/ lazy(() => import('./EVMProvider'))

// preloadEVMProvider warms the chunk so by the time the shell renders
// the chunk is in React.lazy's cache and resolves synchronously. Calling
// `import()` more than once on the same module is cheap (the module
// graph caches the promise).
export const preloadEVMProvider = (): Promise<unknown> => import('./EVMProvider')
