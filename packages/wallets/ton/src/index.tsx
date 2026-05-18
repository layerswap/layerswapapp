'use client'
// Thin static surface of @layerswap/wallet-ton. Importing this file —
// what `createTONShell` callers do — must NOT statically pull in
// @tonconnect/ui-react, @ton/core, or the connection/transfer hooks.
// Those live in TONConnectionRegistrar.tsx (lazy chunk loaded by
// defineWalletProvider's connectionRegistrar option).

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { TonGasProvider } from "./tonGasProvider"
import { TonConfigContext, TonProviderWrapper, type TonClientConfig } from "./shellInternals"

export type { TonClientConfig }
export type TONProviderConfig = BaseWalletProviderConfig & {
    tonConfigs?: TonClientConfig
}

export { useTonConfig } from "./shellInternals"

import { preloadTONProvider as preloadTONProviderWrapper } from "./shellInternals"

export const preloadTONProvider = (): Promise<unknown> =>
    Promise.all([preloadTONProviderWrapper(), import("./TONConnectionRegistrar")])
export { createTONProvider, TONProvider } from "./legacy"

// Default order: 600. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createTONShell(
    config: Pick<TONProviderConfig, 'tonConfigs'> & { order?: number } = {},
): WalletProviderShell {
    const { tonConfigs, order = 600 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <TonConfigContext.Provider value={tonConfigs || null}>
            <Suspense fallback={null}>
                <TonProviderWrapper tonConfigs={tonConfigs}>
                    {children}
                </TonProviderWrapper>
            </Suspense>
        </TonConfigContext.Provider>
    )

    return defineWalletProvider({
        id: "ton",
        order,
        wrapper: Wrapper,
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./TONConnectionRegistrar
        // imports useTONConnection, useTONTransfer, TonAddressUtilsProvider —
        // none of which are reachable from this static file's import graph.
        connectionRegistrar: () => import("./TONConnectionRegistrar"),
        balanceProvider: [
            new LazyBalanceProvider(
                (n) => KnownInternalNames.Networks.TONMainnet.includes(n.name),
                () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider(tonConfigs?.tonApiKey)),
            ),
        ],
        gasProvider: [new TonGasProvider()],
        // addressUtilsProvider intentionally omitted — TonAddressUtilsProvider
        // pulls @ton/core at module scope. The registrar constructs it inside
        // the lazy chunk and merges it into the registered provider.
    })
}
