import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { TronGasProvider } from "./tronGasProvider";
import TronProviderWrapper from "./TronProvider";
import useTronConnection from "./useTronConnection";
import { TronBalanceProvider } from "./tronBalanceProvider";
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider";
import React from "react";
import { useTronTransfer } from "./transferProvider/useTronTransfer";

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <TronProviderWrapper>
                {children}
            </TronProviderWrapper>
        );
    };

    const walletConnectionProvider = customHook || useTronConnection;

    const defaultBalanceProviders = [new TronBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new TronGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new TronAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultTransferProviders = [useTronTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "tron",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createTronProvider() instead. This export will be removed in a future version.
 */
export const TronProvider: WalletProvider = {
    id: "tron",
    wrapper: TronProviderWrapper,
    walletConnectionProvider: useTronConnection,
    addressUtilsProvider: [new TronAddressUtilsProvider()],
    gasProvider: [new TronGasProvider()],
    balanceProvider: [new TronBalanceProvider()],
    transferProvider: [useTronTransfer],
};