'use client'
import { create } from 'zustand'
import { useEffect, useMemo } from 'react'
import type {
    WalletConnectionProvider,
    AddressUtilsProvider,
    BalanceProvider,
    GasProvider,
    ContractAddressCheckerProvider,
    RpcHealthCheckProvider,
    NftProvider,
} from '@/types'
import type { TransferProvider } from '@/types/transfer'

export type RegisteredWalletProvider = {
    id: string
    order: number
    connection: WalletConnectionProvider
    transferProviders: TransferProvider[]
    balanceProviders: BalanceProvider[]
    gasProviders: GasProvider[]
    addressUtilsProviders: AddressUtilsProvider[]
    nftProviders: NftProvider[]
    contractAddressProviders: ContractAddressCheckerProvider[]
    rpcHealthCheckProviders: RpcHealthCheckProvider[]
}

type RegistryState = {
    providers: Map<string, RegisteredWalletProvider>
    register: (provider: RegisteredWalletProvider) => void
    unregister: (id: string) => void
}

// Tree-stable registry. Each chain shell's registrar writes its resolved
// provider here from a useEffect; consumers read via the hooks below. The
// store sits *outside* the React tree so that a chain's lazy chunk landing
// and triggering a register() doesn't remount any consumer subtree.
const useRegistryStore = create<RegistryState>((set) => ({
    providers: new Map(),
    register: (provider) =>
        set((state) => {
            const next = new Map(state.providers)
            next.set(provider.id, provider)
            return { providers: next }
        }),
    unregister: (id) =>
        set((state) => {
            if (!state.providers.has(id)) return state
            const next = new Map(state.providers)
            next.delete(id)
            return { providers: next }
        }),
}))

// Registrar-side hook. A chain shell's registrar component calls this with
// the resolved provider; we register on mount, unregister on unmount. The
// `provider` object is rebuilt by the registrar each render but each field
// (connection, transferProviders, etc.) is itself memoised by the chain's
// hook — see `provider` shape comments in `defineWalletProvider.tsx`. We
// register every time it changes because the connection object may carry
// fresh closures (e.g. wagmi connect callbacks).
export function useRegisterWalletConnectionProvider(provider: RegisteredWalletProvider) {
    useEffect(() => {
        useRegistryStore.getState().register(provider)
        return () => useRegistryStore.getState().unregister(provider.id)
    }, [provider])
}

const selectProvidersMap = (state: RegistryState) => state.providers

export function useRegisteredWalletProviders(): RegisteredWalletProvider[] {
    const providers = useRegistryStore(selectProvidersMap)
    return useMemo(
        () => Array.from(providers.values()).sort((a, b) => a.order - b.order),
        [providers],
    )
}

export function useWalletConnectionProviders(): WalletConnectionProvider[] {
    const sorted = useRegisteredWalletProviders()
    return useMemo(() => sorted.map((p) => p.connection), [sorted])
}

// Convenience selector for cross-chain consumers (e.g. Paradex reads EVM
// and Starknet connection state from here). Returns `undefined` while
// that chain's shell is still rendering its lazy chunk / its registrar's
// effect hasn't fired yet — callers must tolerate this first-render gap.
// This replaces the pre-shell pattern of calling another chain's hook
// inline, which violated Rules of Hooks across renders.
export function useWalletConnectionProviderById(id: string): WalletConnectionProvider | undefined {
    return useRegistryStore((state) => state.providers.get(id)?.connection)
}
