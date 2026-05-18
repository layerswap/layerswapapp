'use client'
// Legacy createSVMProvider / SVMProvider factory + deprecated singleton.
// Lives in its own file so importing `createSVMShell` from the package
// barrel does NOT statically pull useSVMConnection / useSVMTransfer /
// SolanaAddressUtilsProvider into the bundle. Consumers that still need
// createSVMProvider import this file directly and accept the bundle cost.
import React, { Suspense } from "react"
import useSVMConnection from "./useSVMConnection"
import { useSVMTransfer } from "./transferProvider/useSVMTransfer"
import { SolanaBalanceProvider } from "./svmBalanceProvider"
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider"
import { WalletProvider, BaseWalletProviderConfig, LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { AppSettings } from "@layerswap/widget/internal"
import { SVMProviderWrapper, WalletConnectConfigContext, type WalletConnectConfig } from "./shellInternals"

export type SVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

export function createSVMProvider(config: SVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
            <Suspense fallback={null}>
                <SVMProviderWrapper>
                    {children}
                </SVMProviderWrapper>
            </Suspense>
        </WalletConnectConfigContext.Provider>
    )

    const walletConnectionProvider = customHook || useSVMConnection

    const defaultBalanceProviders = [new SolanaBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.Solana,
            () => import("./svmGasProvider").then(m => new m.SolanaGasProvider())
        ),
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new SolanaAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [useSVMTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "solana",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

/**
 * @deprecated Use createSVMShell() (lazy chunk path) or createSVMProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const SVMProvider: WalletProvider = {
    id: "solana",
    wrapper: ({ children }: { children: React.ReactNode }) => (
        <WalletConnectConfigContext.Provider value={AppSettings.WalletConnectConfig ?? null}>
            <Suspense fallback={null}>
                <SVMProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                    {children}
                </SVMProviderWrapper>
            </Suspense>
        </WalletConnectConfigContext.Provider>
    ),
    walletConnectionProvider: useSVMConnection,
    addressUtilsProvider: [new SolanaAddressUtilsProvider()],
    gasProvider: [
        new LazyGasProvider(
            (n) => n.type === NetworkType.Solana,
            () => import("./svmGasProvider").then(m => new m.SolanaGasProvider())
        ),
    ],
    balanceProvider: [new SolanaBalanceProvider()],
    transferProvider: [useSVMTransfer],
}
