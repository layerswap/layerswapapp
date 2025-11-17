import { WalletProvider, BaseWalletProviderConfig, ThemeData } from "@layerswap/widget/types";
import { TonBalanceProvider } from "./tonBalanceProvider";
import { TonGasProvider } from "./tonGasProvider";
import TonProviderWrapper from "./TonProvider";
import useTONConnection from "./useTONConnection";
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider";
import React, { createContext, useContext, useMemo } from "react";
import { AppSettings } from "@layerswap/widget/internal";

export type TonClientConfig = {
    tonApiKey: string
    manifestUrl: string
}

export type TONProviderConfig = BaseWalletProviderConfig & {
    tonConfigs?: TonClientConfig
}

const TonConfigContext = createContext<TonClientConfig | null>(null);

export const useTonConfig = () => {
    const context = useContext(TonConfigContext);
    if (!context) {
        return null;
    }
    return context;
};

export function createTONProvider(config: TONProviderConfig = {}): WalletProvider {
    const {
        tonConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders
    } = config;

    const resolvedTonConfigs: TonClientConfig = useMemo(() => ({
        tonApiKey: tonConfigs?.tonApiKey || AppSettings.TonClientConfig.tonApiKey,
        manifestUrl: tonConfigs?.manifestUrl || AppSettings.TonClientConfig.manifestUrl
    }), [tonConfigs])

    const WrapperComponent = ({ children, themeData }: { children: React.ReactNode, themeData?: ThemeData }) => {
        return (
            <TonConfigContext.Provider value={resolvedTonConfigs}>
                <TonProviderWrapper tonConfigs={resolvedTonConfigs} themeData={themeData}>
                    {children}
                </TonProviderWrapper>
            </TonConfigContext.Provider>
        );
    };

    const walletConnectionProvider = customHook || useTONConnection;

    const defaultBalanceProviders = [new TonBalanceProvider(tonConfigs?.tonApiKey)];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new TonGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new TonAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    return {
        id: "ton",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
    };
}