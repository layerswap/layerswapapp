'use client'
import React, { ComponentType, FC, ReactNode, Suspense, lazy, useMemo } from 'react'
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

// Static-context bundle a lazy connection registrar receives via props.
// Everything in here is plain data — no hooks, no React.lazy refs —
// because it's captured at definition time and copied into the registry
// entry by the registrar.
export type LazyConnectionRegistrarStatic = Pick<
    RegisteredWalletProvider,
    'id' | 'order' | 'balanceProviders' | 'gasProviders' | 'addressUtilsProviders' | 'nftProviders'
>

export type LazyConnectionRegistrarProps = {
    staticDefinition: LazyConnectionRegistrarStatic
}

export type LazyConnectionRegistrarLoader = () => Promise<{
    default: ComponentType<LazyConnectionRegistrarProps>
}>

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
    // Optional alternative to `walletConnectionProvider` + `transferProvider`:
    // a dynamic import returning a component that handles its own hook
    // calls + registry write. Used to keep heavy connection-layer
    // dependencies (e.g. wagmi for EVM) off the static bundle of the
    // chain package. When provided, the shell renders the lazy component
    // inside a Suspense boundary as a *sibling* of children — so children
    // are never hidden by the registrar's loading state. Mutually
    // exclusive with `walletConnectionProvider`; if both are set the lazy
    // path wins.
    connectionRegistrar?: LazyConnectionRegistrarLoader
    // Controls whether the wrapper renders as an ancestor of `children`
    // or only of the registrar. Default `true` preserves the historical
    // behavior (wrapper wraps both registrar and children). Set to
    // `false` when the wrapper provides a chain-SDK context (WagmiProvider,
    // StarknetConfig, etc.) that NO consumer in `children` reads from
    // directly — i.e., children only access the connection through the
    // registry. With `false`, a lazy wrapper's Suspense boundary cannot
    // hide `children` while the chain SDK chunk loads, eliminating the
    // multi-stage flicker that nested lazy wrappers otherwise cause.
    wrapperHostsChildren?: boolean
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
        connectionRegistrar,
        wrapperHostsChildren = true,
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

    // Three registrar modes, in priority order:
    //   1. Lazy: `connectionRegistrar` provided → wagmi-touching code
    //      lives in a separate chunk loaded on demand.
    //   2. Inline: `walletConnectionProvider` provided → today's path,
    //      hook is called by an inline registrar component.
    //   3. None: wrapper-only chains (Immutable Passport).
    let renderRegistrar: (() => ReactNode) | null = null

    if (connectionRegistrar) {
        // Capture the lazy ref once per definition so React.lazy's
        // internal cache keys this single loader, not a new one per
        // render.
        const LazyRegistrar = lazy(connectionRegistrar)
        const staticDefinition: LazyConnectionRegistrarStatic = {
            id,
            order,
            balanceProviders: staticBalanceProviders,
            gasProviders: staticGasProviders,
            addressUtilsProviders: staticAddressUtilsProviders,
            nftProviders: staticNftProviders,
        }
        renderRegistrar = () => (
            // fallback={null} keeps the registrar invisible while its
            // chunk loads. The lazy registrar is rendered as a *sibling*
            // of children (not wrapping them), so this Suspense never
            // hides downstream UI — only the registrar itself.
            <Suspense fallback={null}>
                <LazyRegistrar staticDefinition={staticDefinition} />
            </Suspense>
        )
    } else if (useConnection) {
        const InlineRegistrar: FC = () => {
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
        InlineRegistrar.displayName = `WalletProviderRegistrar(${id})`
        renderRegistrar = () => <InlineRegistrar />
    }

    // The shell renders the chain's context wrapper (if any) and the
    // registrar in one of two arrangements, controlled by
    // `wrapperHostsChildren`:
    //
    // - `wrapperHostsChildren = true` (default): the wrapper wraps both
    //   the registrar and `children`. Use this when something in
    //   `children` reads a context provided by the wrapper.
    //
    // - `wrapperHostsChildren = false`: the wrapper wraps only the
    //   registrar; `children` render as a sibling, outside any Suspense
    //   boundary the wrapper may contain. Use this for chains whose
    //   wrapper provides an SDK context (WagmiProvider etc.) that is
    //   accessed only by the registrar — the registry pattern means
    //   children call into those SDKs through registry-captured closures,
    //   not via direct hooks, so no React context is needed in `children`.
    //   Critically, this prevents a lazy chain-SDK chunk from hiding the
    //   form while it loads.
    const ShellComponent: FC<{ children: ReactNode }> = ({ children }) => {
        if (wrapperHostsChildren) {
            const inner = renderRegistrar ? (
                <>
                    {renderRegistrar()}
                    {children}
                </>
            ) : <>{children}</>
            if (UserWrapper) {
                return <UserWrapper>{inner}</UserWrapper>
            }
            return inner
        }

        // Wrapper hosts only the registrar; children render as a sibling.
        const registrarHost = renderRegistrar ? renderRegistrar() : null
        const wrappedRegistrar = UserWrapper
            ? (registrarHost ? <UserWrapper>{registrarHost}</UserWrapper> : null)
            : registrarHost
        return (
            <>
                {wrappedRegistrar}
                {children}
            </>
        )
    }
    ShellComponent.displayName = `WalletProviderShell(${id})`

    const Shell = ShellComponent as WalletProviderShell
    Object.defineProperty(Shell, 'providerId', { value: id, writable: false })
    Object.defineProperty(Shell, 'providerOrder', { value: order, writable: false })

    return Shell
}
