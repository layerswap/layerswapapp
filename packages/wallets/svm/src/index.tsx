import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import useSVMConnection from "./useSVMConnection";
import SVMProviderWrapper from "./SVMProvider";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaGasProvider } from "./svmGasProvider";
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider";
import React from "react";

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type SVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

export function createSVMProvider(config: SVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <SVMProviderWrapper walletConnectConfigs={walletConnectConfigs}>
                {children}
            </SVMProviderWrapper>
        );
    };

    const walletConnectionProvider = customHook || useSVMConnection;

    const defaultBalanceProviders = [new SolanaBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new SolanaGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new SolanaAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    return {
        id: "solana",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
    };
}