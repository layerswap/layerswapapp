import { WalletProvider, BaseWalletProviderConfig, ThemeData, LazyBalanceProvider } from "@layerswap/widget/types";
import { TonGasProvider } from "./tonGasProvider";
import useTONConnection from "./useTONConnection";
import { TonAddressUtilsProvider } from "./tonAddressUtilsProvider";
import React, { ComponentProps, createContext, lazy, Suspense, useContext } from "react";
let TonProviderImpl: typeof import("./TonProvider")["default"] | null = null

const loadTonProviderModule = async () => {
    const m = await import("./TonProvider")
    TonProviderImpl = m.default
}

const TonProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import("./TonProvider")
    TonProviderImpl = m.default
    return m
});

const TonProviderWrapper = (props: ComponentProps<typeof TonProviderWrapperLazy>) => {
    if (TonProviderImpl) {
        const Impl = TonProviderImpl
        return <Impl {...props} />
    }
    return <TonProviderWrapperLazy {...props} />
}

export const preloadTONProvider = loadTonProviderModule
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { useTONTransfer } from "./transferProvider/useTONTransfer";

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
        addressUtilsProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children, themeData }: { children: React.ReactNode, themeData?: ThemeData }) => {
        return (
            <TonConfigContext.Provider value={tonConfigs || null}>
                <Suspense fallback={null}>
                    <TonProviderWrapper tonConfigs={tonConfigs} themeData={themeData}>
                        {children}
                    </TonProviderWrapper>
                </Suspense>
            </TonConfigContext.Provider>
        );
    };

    const walletConnectionProvider = customHook || useTONConnection;

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
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createTONProvider() instead. This export will be removed in a future version.
 * Note: This uses default TON configuration from AppSettings.
 */
export const TONProvider: WalletProvider = {
    id: "ton",
    wrapper: ({ children, themeData }: { children: React.ReactNode, themeData?: ThemeData }) => {
        const configs = AppSettings.TonClientConfig;
        console.log('configs', configs)
        return (
            <TonConfigContext.Provider value={configs}>
                <Suspense fallback={null}>
                    <TonProviderWrapper tonConfigs={configs} themeData={themeData}>
                        {children}
                    </TonProviderWrapper>
                </Suspense>
            </TonConfigContext.Provider>
        );
    },
    walletConnectionProvider: useTONConnection,
    addressUtilsProvider: [new TonAddressUtilsProvider()],
    gasProvider: [new TonGasProvider()],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TONMainnet.includes(n.name),
            () => import("./tonBalanceProvider").then(m => new m.TonBalanceProvider())
        )
    ],
    transferProvider: [useTONTransfer],
};
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal";

export function createTONShell(config: TONProviderConfig & { order?: number } = {}): WalletProviderShell {
    const { order = 600, ...rest } = config
    const provider = createTONProvider(rest)
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
