'use client'
// Legacy createStarknetProvider / StarknetProvider factory + deprecated
// singleton. Lives in its own file so importing `createStarknetShell`
// from the package barrel does NOT statically pull useStarknetConnection
// / useStarknetTransfer / StarknetNftProvider into the bundle.
// Consumers that still need createStarknetProvider import this file
// directly and accept the bundle cost.
import React, { Suspense } from "react"
import useStarknetConnection from "./useStarknetConnection"
import { useStarknetTransfer } from "./useStarknetTransfer"
import { StarknetBalanceProvider } from "./starknetBalanceProvider"
import { StarknetNftProvider } from "./starknetNftProvider"
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider"
import { WalletProvider, NftProvider, LazyGasProvider, BaseWalletProviderConfig } from "@layerswap/widget/types"
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal"
import { StarknetProviderWrapper } from "./shellInternals"

const isStarknetNetwork = (name: string) =>
    KnownInternalNames.Networks.StarkNetMainnet.includes(name) ||
    KnownInternalNames.Networks.StarkNetGoerli.includes(name) ||
    KnownInternalNames.Networks.StarkNetSepolia.includes(name)

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    nftProviders?: NftProvider | NftProvider[]
}

export function createStarknetProvider(config: StarknetProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        nftProviders,
        transferProviders,
    } = config

    const walletConnectionProvider = customHook || useStarknetConnection

    const defaultBalanceProviders = [new StarknetBalanceProvider()]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        ),
    ]
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders

    const defaultAddressUtilsProviders = [new StarknetAddressUtilsProvider()]
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders

    const defaultNftProviders = [new StarknetNftProvider()]
    const finalNftProviders = nftProviders !== undefined
        ? (Array.isArray(nftProviders) ? nftProviders : [nftProviders])
        : defaultNftProviders

    const defaultTransferProviders = [useStarknetTransfer]
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <StarknetProviderWrapper>{children}</StarknetProviderWrapper>
        </Suspense>
    )

    return {
        id: "starknet",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        nftProvider: finalNftProviders,
        transferProvider: finalTransferProviders,
    }
}

/**
 * @deprecated Use createStarknetShell() (lazy chunk path) or createStarknetProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const StarknetProvider: WalletProvider = {
    id: "starknet",
    wrapper: ({ children }: { children: React.ReactNode }) => (
        <Suspense fallback={null}>
            <StarknetProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                {children}
            </StarknetProviderWrapper>
        </Suspense>
    ),
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: [new StarknetAddressUtilsProvider()],
    gasProvider: [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        ),
    ],
    balanceProvider: [new StarknetBalanceProvider()],
    nftProvider: [new StarknetNftProvider()],
    transferProvider: [useStarknetTransfer],
}
