'use client'
// Thin static surface of @layerswap/wallet-tron. Importing this file —
// what `createTronShell` callers do — must NOT statically pull in
// @tronweb3/tronwallet-adapter-react-hooks, tronweb, or the connection/
// transfer hooks. Those live in TronConnectionRegistrar.tsx (lazy chunk
// loaded by defineWalletProvider's connectionRegistrar option).

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider"
import { TronGasProvider } from "./tronGasProvider"
import { TronProviderWrapper } from "./shellInternals"

export type TronProviderConfig = BaseWalletProviderConfig

import { preloadTronProvider as preloadTronProviderWrapper } from "./shellInternals"

export const preloadTronProvider = (): Promise<unknown> =>
    Promise.all([preloadTronProviderWrapper(), import("./TronConnectionRegistrar")])
export { createTronProvider, TronProvider } from "./legacy"

// Default order: 800. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createTronShell(
    config: TronProviderConfig & { order?: number } = {},
): WalletProviderShell {
    const { order = 800 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Suspense fallback={null}>
            <TronProviderWrapper>
                {children}
            </TronProviderWrapper>
        </Suspense>
    )

    return defineWalletProvider({
        id: "tron",
        order,
        wrapper: Wrapper,
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./TronConnectionRegistrar
        // imports useTronConnection, useTronTransfer — neither reachable
        // from this static file's import graph.
        connectionRegistrar: () => import("./TronConnectionRegistrar"),
        balanceProvider: [
            new LazyBalanceProvider(
                (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
                () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider()),
            ),
        ],
        gasProvider: [new TronGasProvider()],
        addressUtilsProvider: [new TronAddressUtilsProvider()],
    })
}
