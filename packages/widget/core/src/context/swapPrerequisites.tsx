import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { SwapPrerequisiteResolver } from '@layerswap/wallet-core'
import type { WalletProvider, WalletProviderDescriptor, WalletWrapper } from '@layerswap/wallet-core/types'

const PrerequisitesContext = createContext(new SwapPrerequisiteResolver())

export function SwapPrerequisitesProvider({ providers, children }: {
    providers: (WalletProvider | WalletProviderDescriptor | WalletWrapper)[]
    children: ReactNode
}) {
    // Use configured descriptors, independently of connection hydration. Loading a wallet
    // must not replace the resolver and unmount an account setup action already in progress.
    const resolver = useMemo(() => new SwapPrerequisiteResolver(
        providers.flatMap(provider => provider.swapPrerequisiteProvider ?? []),
    ), [providers])
    return <PrerequisitesContext.Provider value={resolver}>{children}</PrerequisitesContext.Provider>
}

export const useSwapPrerequisiteResolver = () => useContext(PrerequisitesContext)
