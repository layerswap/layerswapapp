import { WalletProvider, BaseWalletProviderConfig, ThemeData, LazyBalanceProvider } from "@layerswap/widget/types";
import { TonGasProvider } from "./tonGasProvider";
import TonProviderWrapper from "./TonProvider";
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider";
import React, { createContext, useContext } from "react";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { useTONTransfer } from "./transferProvider/useTONTransfer";
import { tonConnectionAdapter } from "./service/tonConnectionAdapter";

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
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config;

    const WrapperComponent = ({ children, themeData }: { children?: React.ReactNode, themeData?: ThemeData }) => {
        return (
            <TonConfigContext.Provider value={tonConfigs || null}>
                <TonProviderWrapper tonConfigs={tonConfigs} themeData={themeData}>
                    {children}
                </TonProviderWrapper>
            </TonConfigContext.Provider>
        );
    };

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TONMainnet.includes(n.name),
            () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider(tonConfigs?.tonApiKey))
        )
    ];
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

    const defaultTransferProviders = [useTONTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "ton",
        wrapper: WrapperComponent,
        createConnection: customConnection ?? tonConnectionAdapter.createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}
