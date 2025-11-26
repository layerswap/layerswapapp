import useBitcoinConnection from "./useBitcoinConnection";
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { BitcoinProvider as BitcoinProviderWrapper } from "./BitcoinProvider";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider";
import React from "react";
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
            <BitcoinProviderWrapper>
                {children}
            </BitcoinProviderWrapper>
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
export const BitcoinProvider: WalletProvider = {
    id: "bitcoin",
    wrapper: BitcoinProviderWrapper,
    walletConnectionProvider: useBitcoinConnection,
    addressUtilsProvider: [new BitcoinAddressUtilsProvider()],
    gasProvider: [new BitcoinGasProvider()],
    balanceProvider: [new BitcoinBalanceProvider()],
    transferProvider: [useBitcoinTransfer],
};