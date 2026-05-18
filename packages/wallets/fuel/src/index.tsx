'use client'
// Thin static surface of @layerswap/wallet-fuel. Importing this file —
// what `createFuelShell` callers do — must NOT statically pull in
// @fuels/react, @fuel-ts/account, @fuel-ts/address, or the connection/
// transfer hooks. Those live in FuelConnectionRegistrar.tsx (lazy chunk
// loaded by defineWalletProvider's connectionRegistrar option).

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { FuelAddressUtilsProvider } from "./fuelAddressUtilsProvider"
import { FuelBalanceProvider } from "./fuelBalanceProvider"
import { FuelGasProvider } from "./fuelGasProvider"
import { FuelProviderWrapper } from "./shellInternals"

export type FuelProviderConfig = BaseWalletProviderConfig

import { preloadFuelProvider as preloadFuelProviderWrapper } from "./shellInternals"

export const preloadFuelProvider = (): Promise<unknown> =>
    Promise.all([preloadFuelProviderWrapper(), import("./FuelConnectionRegistrar")])
export { createFuelProvider, FuelProvider } from "./legacy"

// Default order: 300. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createFuelShell(
    config: FuelProviderConfig & { order?: number } = {},
): WalletProviderShell {
    const { order = 300 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Suspense fallback={null}>
            <FuelProviderWrapper>
                {children}
            </FuelProviderWrapper>
        </Suspense>
    )

    return defineWalletProvider({
        id: "fuel",
        order,
        wrapper: Wrapper,
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./FuelConnectionRegistrar
        // imports useFuelConnection, useFuelTransfer — neither reachable
        // from this static file's import graph.
        connectionRegistrar: () => import("./FuelConnectionRegistrar"),
        balanceProvider: [new FuelBalanceProvider()],
        gasProvider: [new FuelGasProvider()],
        addressUtilsProvider: [new FuelAddressUtilsProvider()],
    })
}
