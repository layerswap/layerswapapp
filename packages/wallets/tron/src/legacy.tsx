'use client'
// Legacy createTronProvider / TronProvider factory + deprecated singleton.
// Lives in its own file so importing `createTronShell` from the package
// barrel does NOT statically pull useTronConnection / useTronTransfer
// into the bundle. Consumers that still need createTronProvider import
// this file directly and accept the bundle cost.
import React, { Suspense } from "react"
import useTronConnection from "./useTronConnection"
import { useTronTransfer } from "./transferProvider/useTronTransfer"
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider"
import { TronGasProvider } from "./tronGasProvider"
import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { TronProviderWrapper } from "./shellInternals"

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <TronProviderWrapper>
                {children}
            </TronProviderWrapper>
        </Suspense>
    )

    const walletConnectionProvider = customHook || useTronConnection

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        ),
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new TronGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new TronAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [useTronTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "tron",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

const TronProviderLazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={null}>
        <TronProviderWrapper>{children}</TronProviderWrapper>
    </Suspense>
)

/**
 * @deprecated Use createTronShell() (lazy chunk path) or createTronProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const TronProvider: WalletProvider = {
    id: "tron",
    wrapper: TronProviderLazyWrapper,
    walletConnectionProvider: useTronConnection,
    addressUtilsProvider: [new TronAddressUtilsProvider()],
    gasProvider: [new TronGasProvider()],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        ),
    ],
    transferProvider: [useTronTransfer],
}
