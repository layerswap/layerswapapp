'use client'
// Thin static surface of @layerswap/wallet-starknet. Importing this file —
// what `createStarknetShell` callers do — must NOT statically pull in
// @starknet-react/core, the starknet SDK, or the connection/transfer
// hooks. Those live in StarknetConnectionRegistrar.tsx (lazy chunk loaded
// by defineWalletProvider's connectionRegistrar option).
//
// The legacy `createStarknetProvider` / `StarknetProvider` exports live
// in ./legacy.tsx; they statically import the heavy modules so anyone
// using them pays that cost. createStarknetShell does not import legacy.tsx.

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, NftProvider, WalletProvider } from "@layerswap/widget/types"
import { LazyGasProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { StarknetBalanceProvider } from "./starknetBalanceProvider"
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider"
import { StarknetProviderWrapper } from "./shellInternals"

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    nftProviders?: NftProvider | NftProvider[]
}

import { preloadStarknetProvider as preloadStarknetProviderWrapper } from "./shellInternals"

// Warms both the @starknet-react/core wrapper chunk and the
// connection-registrar chunk. See EVM's preloadEVMProvider for rationale.
export const preloadStarknetProvider = (): Promise<unknown> =>
    Promise.all([preloadStarknetProviderWrapper(), import("./StarknetConnectionRegistrar")])
export { createStarknetProvider, StarknetProvider } from "./legacy"
export { default as useStarknetConnection } from "./useStarknetConnection"

const isStarknetNetwork = (name: string) =>
    KnownInternalNames.Networks.StarkNetMainnet.includes(name) ||
    KnownInternalNames.Networks.StarkNetGoerli.includes(name) ||
    KnownInternalNames.Networks.StarkNetSepolia.includes(name)

// Default order: 200. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createStarknetShell(
    config: StarknetProviderConfig & { order?: number } = {},
): WalletProviderShell {
    const { order = 200 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <Suspense fallback={null}>
            <StarknetProviderWrapper>{children}</StarknetProviderWrapper>
        </Suspense>
    )

    return defineWalletProvider({
        id: "starknet",
        order,
        wrapper: Wrapper,
        // StarknetConfig context is consumed only inside this package
        // (the registrar). Render children as a sibling so they aren't
        // hidden by the lazy chain-SDK Suspense boundary.
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./StarknetConnectionRegistrar
        // imports useStarknetConnection, useStarknetTransfer, StarknetNftProvider —
        // none of which are reachable from this static file's import graph.
        connectionRegistrar: () => import("./StarknetConnectionRegistrar"),
        balanceProvider: [new StarknetBalanceProvider()],
        gasProvider: [
            new LazyGasProvider(
                (n) => isStarknetNetwork(n.name),
                () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider()),
            ),
        ],
        addressUtilsProvider: [new StarknetAddressUtilsProvider()],
    })
}
