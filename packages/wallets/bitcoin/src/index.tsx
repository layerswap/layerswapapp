import useBitcoinConnection from "./useBitcoinConnection";
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider";
import React, { ComponentProps, lazy, Suspense } from "react";
let BitcoinProviderImpl: typeof import("./BitcoinProvider")["BitcoinProvider"] | null = null

const loadBitcoinProviderModule = async () => {
    const m = await import("./BitcoinProvider")
    BitcoinProviderImpl = m.BitcoinProvider
}

const BitcoinProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import("./BitcoinProvider")
    BitcoinProviderImpl = m.BitcoinProvider
    return { default: m.BitcoinProvider }
});

const BitcoinProviderWrapper = (props: ComponentProps<typeof BitcoinProviderWrapperLazy>) => {
    if (BitcoinProviderImpl) {
        const Impl = BitcoinProviderImpl
        return <Impl {...props} />
    }
    return <BitcoinProviderWrapperLazy {...props} />
}

export const preloadBitcoinProvider = loadBitcoinProviderModule
import { useBitcoinTransfer } from "./transferProvider/useBitcoinTransfer";

export type BitcoinProviderConfig = BaseWalletProviderConfig

export function createBitcoinProvider(config: BitcoinProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <Suspense fallback={null}>
                <BitcoinProviderWrapper>
                    {children}
                </BitcoinProviderWrapper>
            </Suspense>
        );
    };

    const walletConnectionProvider = customHook || useBitcoinConnection;

    const defaultBalanceProviders = [new BitcoinBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new BitcoinGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new BitcoinAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;


    const defaultTransferProviders = [useBitcoinTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "bitcoin",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createBitcoinProvider() instead. This export will be removed in a future version.
 */
const BitcoinProviderLazyWrapper = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={null}>
        <BitcoinProviderWrapper>{children}</BitcoinProviderWrapper>
    </Suspense>
);

export const BitcoinProvider: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProviderLazyWrapper,
    walletConnectionProvider: useBitcoinConnection,
    addressUtilsProvider: [new BitcoinAddressUtilsProvider()],
    gasProvider: [new BitcoinGasProvider()],
    balanceProvider: [new BitcoinBalanceProvider()],
    transferProvider: [useBitcoinTransfer],
};
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal";

export function createBitcoinShell(config: BitcoinProviderConfig & { order?: number } = {}): WalletProviderShell {
    const { order = 500, ...rest } = config
    const provider = createBitcoinProvider(rest)
    return defineWalletProvider({
        id: provider.id,
        order,
        wrapper: provider.wrapper as React.ComponentType<{ children: React.ReactNode }>,
        walletConnectionProvider: provider.walletConnectionProvider,
        transferProvider: provider.transferProvider,
        balanceProvider: provider.balanceProvider,
        gasProvider: provider.gasProvider,
        addressUtilsProvider: provider.addressUtilsProvider,
        contractAddressProvider: provider.contractAddressProvider,
        rpcHealthCheckProvider: provider.rpcHealthCheckProvider,
    })
}
