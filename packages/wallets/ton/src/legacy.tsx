'use client'
// Legacy createTONProvider / TONProvider factory + deprecated singleton.
// Lives in its own file so importing `createTONShell` from the package
// barrel does NOT statically pull useTONConnection / useTONTransfer /
// TonAddressUtilsProvider into the bundle. Consumers that still need
// createTONProvider import this file directly and accept the bundle cost.
import React, { Suspense } from "react"
import useTONConnection from "./useTONConnection"
import { useTONTransfer } from "./transferProvider/useTONTransfer"
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider"
import { TonGasProvider } from "./tonGasProvider"
import { WalletProvider, BaseWalletProviderConfig, ThemeData, LazyBalanceProvider } from "@layerswap/widget/types"
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal"
import { TonConfigContext, TonProviderWrapper, type TonClientConfig } from "./shellInternals"

export type TONProviderConfig = BaseWalletProviderConfig & {
    tonConfigs?: TonClientConfig
}

export function createTONProvider(config: TONProviderConfig = {}): WalletProvider {
    const {
        tonConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const WrapperComponent = ({ children, themeData }: { children: React.ReactNode, themeData?: ThemeData }) => (
        <TonConfigContext.Provider value={tonConfigs || null}>
            <Suspense fallback={null}>
                <TonProviderWrapper tonConfigs={tonConfigs} themeData={themeData}>
                    {children}
                </TonProviderWrapper>
            </Suspense>
        </TonConfigContext.Provider>
    )

    const walletConnectionProvider = customHook || useTONConnection

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TONMainnet.includes(n.name),
            () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider(tonConfigs?.tonApiKey))
        ),
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new TonGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new TonAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [useTONTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "ton",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

/**
 * @deprecated Use createTONShell() (lazy chunk path) or createTONProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const TONProvider: WalletProvider = {
    id: "ton",
    wrapper: ({ children, themeData }: { children: React.ReactNode, themeData?: ThemeData }) => {
        const configs = AppSettings.TonClientConfig
        return (
            <TonConfigContext.Provider value={configs}>
                <Suspense fallback={null}>
                    <TonProviderWrapper tonConfigs={configs} themeData={themeData}>
                        {children}
                    </TonProviderWrapper>
                </Suspense>
            </TonConfigContext.Provider>
        )
    },
    walletConnectionProvider: useTONConnection,
    addressUtilsProvider: [new TonAddressUtilsProvider()],
    gasProvider: [new TonGasProvider()],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TONMainnet.includes(n.name),
            () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider())
        ),
    ],
    transferProvider: [useTONTransfer],
}
