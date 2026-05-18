'use client'
// Thin static surface of @layerswap/wallet-bitcoin. Importing this file —
// what `createBitcoinShell` callers do — must NOT statically pull in
// @bigmi/react, @bigmi/client, bitcoinjs-lib, or the connection/transfer
// hooks. Those live in BitcoinConnectionRegistrar.tsx (lazy chunk loaded
// by defineWalletProvider's connectionRegistrar option).

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider"
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider"
import { BitcoinProviderWrapper } from "./shellInternals"

export type BitcoinProviderConfig = BaseWalletProviderConfig

import { preloadBitcoinProvider as preloadBitcoinProviderWrapper } from "./shellInternals"

export const preloadBitcoinProvider = (): Promise<unknown> =>
    Promise.all([preloadBitcoinProviderWrapper(), import("./BitcoinConnectionRegistrar")])
export { createBitcoinProvider, BitcoinProvider } from "./legacy"

// Default order: 500. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createBitcoinShell(
    config: BitcoinProviderConfig & { order?: number } = {},
): WalletProviderShell {
    const { order = 500 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Suspense fallback={null}>
            <BitcoinProviderWrapper>
                {children}
            </BitcoinProviderWrapper>
        </Suspense>
    )

    return defineWalletProvider({
        id: "bitcoin",
        order,
        wrapper: Wrapper,
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./BitcoinConnectionRegistrar
        // imports useBitcoinConnection, useBitcoinTransfer, BitcoinGasProvider —
        // none of which are reachable from this static file's import graph.
        connectionRegistrar: () => import("./BitcoinConnectionRegistrar"),
        balanceProvider: [new BitcoinBalanceProvider()],
        addressUtilsProvider: [new BitcoinAddressUtilsProvider()],
        // gasProvider intentionally omitted — BitcoinGasProvider transitively
        // imports bitcoinjs-lib via the PSBT builder. The registrar
        // constructs it inside the lazy chunk and merges it into the
        // registered provider.
    })
}
