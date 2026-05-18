'use client'
// Thin static surface of @layerswap/wallet-svm. Importing this file —
// what `createSVMShell` callers do — must NOT statically pull in
// @solana/wallet-adapter-react, @solana/web3.js, or the connection/
// transfer hooks. Those live in SVMConnectionRegistrar.tsx (lazy chunk
// loaded by defineWalletProvider's connectionRegistrar option).

import React, { ReactNode, Suspense } from "react"
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal"
import type { BaseWalletProviderConfig, WalletProvider } from "@layerswap/widget/types"
import { LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { SolanaBalanceProvider } from "./svmBalanceProvider"
import { SVMProviderWrapper, WalletConnectConfigContext, type WalletConnectConfig } from "./shellInternals"

export type { WalletConnectConfig }
export type SVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

export { useWalletConnectConfig } from "./shellInternals"

import { preloadSVMProvider as preloadSVMProviderWrapper } from "./shellInternals"

export const preloadSVMProvider = (): Promise<unknown> =>
    Promise.all([preloadSVMProviderWrapper(), import("./SVMConnectionRegistrar")])
export { createSVMProvider, SVMProvider } from "./legacy"

// Default order: 700. Earlier chains (smaller numbers) win when multiple
// providers support the same network — mirrors the legacy array-order
// resolution in useWallet.resolveProvider.
export function createSVMShell(
    config: Pick<SVMProviderConfig, 'walletConnectConfigs'> & { order?: number } = {},
): WalletProviderShell {
    const { walletConnectConfigs, order = 700 } = config

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
            <Suspense fallback={null}>
                <SVMProviderWrapper>
                    {children}
                </SVMProviderWrapper>
            </Suspense>
        </WalletConnectConfigContext.Provider>
    )

    return defineWalletProvider({
        id: "solana",
        order,
        wrapper: Wrapper,
        wrapperHostsChildren: false,
        // Lazy connection registrar: the chunk at ./SVMConnectionRegistrar
        // imports useSVMConnection, useSVMTransfer, SolanaAddressUtilsProvider —
        // none of which are reachable from this static file's import graph.
        connectionRegistrar: () => import("./SVMConnectionRegistrar"),
        balanceProvider: [new SolanaBalanceProvider()],
        gasProvider: [
            new LazyGasProvider(
                (n) => n.type === NetworkType.Solana,
                () => import("./svmGasProvider").then(m => new m.SolanaGasProvider()),
            ),
        ],
        // addressUtilsProvider intentionally omitted — SolanaAddressUtilsProvider
        // pulls @solana/web3.js at module scope, so it's constructed inside the
        // lazy registrar instead. The registrar adds it to the registered
        // provider after the chunk lands.
    })
}
