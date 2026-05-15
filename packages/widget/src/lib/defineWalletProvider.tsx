'use client'
import React, { FC, ReactNode, useMemo } from 'react'
import { useSettingsState } from '@/context/settings'
import {
    RegisteredWalletProvider,
    useRegisterWalletConnectionProvider,
} from '@/context/walletConnectionRegistry'
import type {
    WalletConnectionProvider,
    WalletConnectionProviderProps,
    AddressUtilsProvider,
    BalanceProvider,
    GasProvider,
    ContractAddressCheckerProvider,
    RpcHealthCheckProvider,
    NftProvider,
} from '@/types'
import type { TransferProvider } from '@/types/transfer'

// The author surface. Fields match the legacy `WalletProvider` shape so
// migration is a rename + a call-site reshuffle, not a redesign. Difference
// vs. the legacy type: `order` is required (controls how `useWallet`
// resolves a network supported by multiple providers, mirroring the old
// array-order semantics), and `wrapper` no longer wraps the entire app —
// it only wraps the registrar + downstream children inside this one shell.
export type WalletProviderDefinition = {
    id: string
    order: number
    wrapper?: React.ComponentType<{ children: ReactNode }>
    // Optional: pure context wrappers (e.g. Immutable Passport, which
    // contributes a context that EVM's connector reads but exposes no
    // wallets of its own) leave this undefined. The resulting shell
    // just renders the wrapper around children — no registrar, no
    // registry entry.
    walletConnectionProvider?: (props: WalletConnectionProviderProps) => WalletConnectionProvider
    transferProvider?: (() => TransferProvider) | (() => TransferProvider)[]
    balanceProvider?: BalanceProvider | BalanceProvider[]
    gasProvider?: GasProvider | GasProvider[]
    addressUtilsProvider?: AddressUtilsProvider | AddressUtilsProvider[]
    nftProvider?: NftProvider | NftProvider[]
    contractAddressProvider?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
    rpcHealthCheckProvider?: RpcHealthCheckProvider | RpcHealthCheckProvider[]
}

export type WalletProviderShell = FC<{ children: ReactNode }> & {
    readonly providerId: string
    readonly providerOrder: number
}

const toArray = <T,>(value: T | T[] | undefined): T[] => {
    if (value === undefined) return []
    return Array.isArray(value) ? value : [value]
}

// Builds the React shell from a definition. The shell is statically
// composed in app code (e.g. `<EVMShell><Swap/></EVMShell>`); the
// definition object never leaves this function. Each call to
// `defineWalletProvider` produces *one* registrar component that calls
// exactly one connection hook and a fixed-length list of transfer hooks
// — so Rules of Hooks holds regardless of how many shells the app
// composes, and rendering or unmounting a shell does not change the hook
// count for any other component.
export function defineWalletProvider(def: WalletProviderDefinition): WalletProviderShell {
    const {
        id,
        order,
        wrapper: UserWrapper,
        walletConnectionProvider: useConnection,
        transferProvider,
        balanceProvider,
        gasProvider,
        addressUtilsProvider,
        nftProvider,
        contractAddressProvider,
        rpcHealthCheckProvider,
    } = def

    // Fixed-length arrays captured at definition time. `transferHooks` is
    // the only one that contains hooks; the rest are plain objects.
    const transferHooks = toArray(transferProvider)
    const staticBalanceProviders = toArray(balanceProvider)
    const staticGasProviders = toArray(gasProvider)
    const staticAddressUtilsProviders = toArray(addressUtilsProvider)
    const staticNftProviders = toArray(nftProvider)
    const staticContractAddressProviders = toArray(contractAddressProvider)
    const staticRpcHealthCheckProviders = toArray(rpcHealthCheckProvider)

    // Wrapper-only shells (e.g. Immutable Passport) skip the registrar
    // — there's no connection hook to call and no entry to register.
    const Registrar: FC | null = useConnection
        ? (() => {
            const Component: FC = () => {
                const { networks } = useSettingsState()
                const connection = useConnection({ networks })
                // Calling each transfer hook here is safe: `transferHooks`
                // is the array captured above and never changes length at
                // runtime, so the hook count is constant for this
                // component instance. This is the crucial difference from
                // `ResolverProviders.tsx:16-20`, which mapped hooks over a
                // runtime-variable array.
                const transferResults = transferHooks.map((hook) => hook())

                const registered = useMemo<RegisteredWalletProvider>(
                    () => ({
                        id,
                        order,
                        connection,
                        transferProviders: transferResults,
                        balanceProviders: staticBalanceProviders,
                        gasProviders: staticGasProviders,
                        addressUtilsProviders: staticAddressUtilsProviders,
                        nftProviders: staticNftProviders,
                        contractAddressProviders: staticContractAddressProviders,
                        rpcHealthCheckProviders: staticRpcHealthCheckProviders,
                    }),
                    // Transfer results are referentially stable when each
                    // transfer hook returns a memoised object — same
                    // expectation we hold of the connection hook. If a
                    // chain's transfer hook produces a fresh object every
                    // render we will re-register every render, which is
                    // correctness-preserving but a perf smell to fix in
                    // the chain itself, not here.
                    [connection, ...transferResults],
                )

                useRegisterWalletConnectionProvider(registered)
                return null
            }
            Component.displayName = `WalletProviderRegistrar(${id})`
            return Component
        })()
        : null

    // The shell renders the chain's context wrapper (if any) around the
    // registrar + downstream children. The registrar is a *sibling* of
    // children inside the wrapper so both run within the wrapper's
    // contexts (e.g. WagmiProvider, StarknetReact, etc.). For wrapper-
    // only chains (Registrar === null) the inner just renders children.
    const ShellComponent: FC<{ children: ReactNode }> = ({ children }) => {
        const inner = Registrar ? (
            <>
                <Registrar />
                {children}
            </>
        ) : <>{children}</>
        if (UserWrapper) {
            return <UserWrapper>{inner}</UserWrapper>
        }
        return inner
    }
    ShellComponent.displayName = `WalletProviderShell(${id})`

    const Shell = ShellComponent as WalletProviderShell
    Object.defineProperty(Shell, 'providerId', { value: id, writable: false })
    Object.defineProperty(Shell, 'providerOrder', { value: order, writable: false })

    return Shell
}
