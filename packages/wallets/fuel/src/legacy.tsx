'use client'
// Legacy createFuelProvider / FuelProvider factory + deprecated singleton.
// Lives in its own file so importing `createFuelShell` from the package
// barrel does NOT statically pull useFuelConnection / useFuelTransfer
// into the bundle. Consumers that still need createFuelProvider import
// this file directly and accept the bundle cost.
import React, { Suspense } from "react"
import useFuelConnection from "./useFuelConnection"
import { useFuelTransfer } from "./transferProvider/useFuelTransfer"
import { FuelAddressUtilsProvider } from "./fuelAddressUtilsProvider"
import { FuelBalanceProvider } from "./fuelBalanceProvider"
import { FuelGasProvider } from "./fuelGasProvider"
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types"
import { FuelProviderWrapper } from "./shellInternals"

export type FuelProviderConfig = BaseWalletProviderConfig

export function createFuelProvider(config: FuelProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <FuelProviderWrapper>
                {children}
            </FuelProviderWrapper>
        </Suspense>
    )

    const walletConnectionProvider = customHook || useFuelConnection

    const defaultBalanceProviders = [new FuelBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [new FuelGasProvider()]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new FuelAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultTransferProviders = [useFuelTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    return {
        id: "fuel",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    }
}

const FuelProviderLazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={null}>
        <FuelProviderWrapper>{children}</FuelProviderWrapper>
    </Suspense>
)

/**
 * @deprecated Use createFuelShell() (lazy chunk path) or createFuelProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const FuelProvider: WalletProvider = {
    id: "fuel",
    wrapper: FuelProviderLazyWrapper,
    walletConnectionProvider: useFuelConnection,
    addressUtilsProvider: [new FuelAddressUtilsProvider()],
    gasProvider: [new FuelGasProvider()],
    balanceProvider: [new FuelBalanceProvider()],
    transferProvider: [useFuelTransfer],
}
