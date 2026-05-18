'use client'
// Thin static surface of @layerswap/wallet-evm. Importing this file —
// what `createEVMShell` callers do — must NOT statically pull in wagmi,
// viem, or any of the connection / transfer / RPC-health code. Those
// modules live in EVMConnectionRegistrar.tsx (lazy chunk loaded by
// defineWalletProvider's connectionRegistrar option).
//
// The legacy `createEVMProvider` / `EVMProvider` exports live in
// ./legacy.tsx; they statically import the heavy modules so anyone using
// them pays that cost. createEVMShell does not import legacy.tsx.

import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import { LazyBalanceProvider, LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { ReactNode, Suspense } from "react"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"
import {
    EVMProviderWrapper,
    WalletConnectConfigContext,
    type EVMProviderConfig,
    type WalletConnectConfig,
} from "./shellInternals"

export type { EVMProviderConfig, WalletConnectConfig }
export { useWalletConnectConfig } from "./shellInternals"

import { preloadEVMProvider as preloadEVMProviderWrapper } from "./shellInternals"

// Warms both the WagmiProvider wrapper chunk and the connection-registrar
// chunk. Callers (e.g. bridge's DefaultChainShells useEffect) fire this
// on mount so the chunks are usually in React.lazy's cache before the
// Suspense boundary first renders — no flicker on chunks landing late.
export const preloadEVMProvider = (): Promise<unknown> =>
    Promise.all([preloadEVMProviderWrapper(), import("./EVMConnectionRegistrar")])
export { useChainConfigs } from "./evmUtils/chainConfigs"

// Re-exports from legacy.tsx — only pull legacy.tsx (with its heavy
// imports) when one of these names is referenced. Tree-shaking should
// keep them out of the bundle for createEVMShell-only callers.
export { createEVMProvider, EVMProvider } from "./legacy"

// useEVMConnection is re-exported for custom-hook integrations that
// want to call it directly. Importing it pulls wagmi — same cost as
// today; that's why the lazy split routes through the registrar chunk
// instead of this static export.
export { default as useEVMConnection } from "./useEVMConnection"

// Cross-package wagmi-config sharing — used by Paradex to call
// @wagmi/core APIs (getWalletClient, switchChain, getChainId) without
// being inside WagmiProvider. The store is a plain TS module with no
// React/wagmi runtime dep at import time.
export { getEVMWagmiConfig, subscribeEVMWagmiConfig } from "./wagmiConfigStore"

// Lazy-loaded chain registrar — wraps the slim createEVMShell so a
// static `import { createEVMShell } from '@layerswap/wallet-evm'`
// doesn't bring wagmi/viem along. The factory captures the order and
// walletConnect config in closure; the lazy registrar reads networks
// and constructs the connection state inside its own chunk.
//
// Default order: 100. Earlier chains (smaller numbers) win when
// multiple providers support the same network — mirrors the legacy
// array-order resolution in useWallet.resolveProvider.
export function createEVMShell(
    config: Pick<EVMProviderConfig, 'walletConnectConfigs'> & { order?: number } = {},
): WalletProviderShell {
    const { walletConnectConfigs, order = 100 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
            <Suspense fallback={null}>
                <EVMProviderWrapper>
                    {children}
                </EVMProviderWrapper>
            </Suspense>
        </WalletConnectConfigContext.Provider>
    )

    return defineWalletProvider({
        id: "evm",
        order,
        wrapper: Wrapper,
        // WagmiProvider is consumed only inside this package's registrar.
        // The wagmi Config is published into a side store
        // (./wagmiConfigStore) so cross-package consumers (Paradex) can
        // call @wagmi/core imperatively without React context. Children
        // therefore don't need WagmiProvider as an ancestor — render
        // them as a sibling of the wrapper so the wagmi chunk's lazy
        // load no longer hides the form.
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./EVMConnectionRegistrar
        // imports useEVMConnection, useEVMTransfer, EVMContractAddressProvider,
        // EVMRpcHealthCheckProvider — none of which are reachable from this
        // static file's import graph.
        connectionRegistrar: () => import("./EVMConnectionRegistrar"),
        balanceProvider: [
            new LazyBalanceProvider(
                (n) => n.type === NetworkType.EVM && !!n.token,
                () => import("./balanceProviders/evmBalanceProvider").then(m => new m.EVMBalanceProvider()),
            ),
            new LazyBalanceProvider(
                (n) => n.name === KnownInternalNames.Networks.HyperliquidMainnet || n.name === KnownInternalNames.Networks.HyperliquidTestnet,
                () => import("./balanceProviders/hyperliquidBalanceProvider").then(m => new m.HyperliquidBalanceProvider()),
            ),
        ],
        gasProvider: [
            new LazyGasProvider(
                (n) => n.type === NetworkType.EVM && !!n.token,
                () => import("./gasProviders/evmGasProvider").then(m => new m.EVMGasProvider()),
            ),
        ],
        addressUtilsProvider: [new EVMAddressUtilsProvider()],
    })
}
