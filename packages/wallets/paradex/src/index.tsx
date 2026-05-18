'use client'
// Thin static surface of @layerswap/wallet-paradex. Importing this file —
// what `createParadexShell` callers do — must NOT statically pull in
// wagmi, @wagmi/core, ethers, or useParadexConnection. Those live in
// ParadexConnectionRegistrar.tsx (lazy chunk loaded by
// defineWalletProvider's connectionRegistrar option).
//
// The wrapper (`ActiveParadexAccountProvider`) is lightweight — it only
// reads from the wallet-connection registry via widget internals — so
// it's safe to import statically. The ParadexMultiStepHandler re-export
// is also light (its body imports only widget internals); tree-shaking
// keeps it out of the bundle when unused.

import React, { ReactNode } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"

export type ParadexProviderConfig = BaseWalletProviderConfig

export { createParadexProvider, ParadexProvider } from "./legacy"
export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"

// Paradex's wrapper (ActiveParadexAccountProvider) is light and already
// statically imported. Only the connection-registrar chunk benefits from
// preloading.
export const preloadParadexProvider = (): Promise<unknown> =>
    import("./ParadexConnectionRegistrar")

// Default order: 400. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createParadexShell(
    config: ParadexProviderConfig & { order?: number } = {},
): WalletProviderShell {
    const { order = 400 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <ActiveParadexAccountProvider>{children}</ActiveParadexAccountProvider>
    )

    return defineWalletProvider({
        id: "paradex",
        order,
        wrapper: Wrapper,
        // Lazy connection registrar: the chunk at ./ParadexConnectionRegistrar
        // imports useParadexConnection (wagmi + ethers + multi-step handler)
        // — none of which are reachable from this static file's import graph.
        connectionRegistrar: () => import("./ParadexConnectionRegistrar"),
        balanceProvider: [
            new LazyBalanceProvider(
                (n) => KnownInternalNames.Networks.ParadexMainnet.includes(n.name) || KnownInternalNames.Networks.ParadexTestnet.includes(n.name),
                () => import("./paradexBalanceProvider").then(m => new m.ParadexBalanceProvider()),
            ),
        ],
    })
}
