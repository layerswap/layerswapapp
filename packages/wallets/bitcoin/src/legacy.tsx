'use client'
// Legacy createBitcoinProvider / BitcoinProvider factory + deprecated
// singleton. Lives in its own file so importing `createBitcoinShell`
// from the package barrel does NOT statically pull useBitcoinConnection /
// useBitcoinTransfer / BitcoinGasProvider into the bundle. Consumers that
// still need createBitcoinProvider import this file directly and accept
// the bundle cost.
import React, { Suspense } from "react"
import useBitcoinConnection from "./useBitcoinConnection"
import { useBitcoinTransfer } from "./transferProvider/useBitcoinTransfer"
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider"
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider"
import { BitcoinGasProvider } from "./bitcoinGasProvider"
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types"
import { BitcoinProviderWrapper } from "./shellInternals"

export type BitcoinProviderConfig = BaseWalletProviderConfig

export function createBitcoinProvider(config: BitcoinProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <BitcoinProviderWrapper>
                {children}
            </BitcoinProviderWrapper>
        </Suspense>
    )

    const walletConnectionProvider = customHook || useBitcoinConnection

    const defaultBalanceProviders = [new BitcoinBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new BitcoinGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new BitcoinAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [useBitcoinTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "bitcoin",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

const BitcoinProviderLazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={null}>
        <BitcoinProviderWrapper>{children}</BitcoinProviderWrapper>
    </Suspense>
)

/**
 * @deprecated Use createBitcoinShell() (lazy chunk path) or createBitcoinProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const BitcoinProvider: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProviderLazyWrapper,
    walletConnectionProvider: useBitcoinConnection,
    addressUtilsProvider: [new BitcoinAddressUtilsProvider()],
    gasProvider: [new BitcoinGasProvider()],
    balanceProvider: [new BitcoinBalanceProvider()],
    transferProvider: [useBitcoinTransfer],
}
