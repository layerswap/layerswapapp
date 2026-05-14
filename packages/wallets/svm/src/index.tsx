import { WalletProvider, BaseWalletProviderConfig, LazyGasProvider, NetworkType } from "@layerswap/widget/types";
import { AppSettings } from "@layerswap/widget/internal";
import useSVMConnection from "./useSVMConnection";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider";
import React, { ComponentProps, createContext, lazy, Suspense, useContext } from "react";
let SVMProviderImpl: typeof import("./SVMProvider")["default"] | null = null

const loadSVMProviderModule = async () => {
    const m = await import("./SVMProvider")
    SVMProviderImpl = m.default
}

const SVMProviderWrapperLazy = /*#__PURE__*/ lazy(async () => {
    const m = await import("./SVMProvider")
    SVMProviderImpl = m.default
    return m
});

const SVMProviderWrapper = (props: ComponentProps<typeof SVMProviderWrapperLazy>) => {
    if (SVMProviderImpl) {
        const Impl = SVMProviderImpl
        return <Impl {...props} />
    }
    return <SVMProviderWrapperLazy {...props} />
}

export const preloadSVMProvider = loadSVMProviderModule
import { useSVMTransfer } from "./transferProvider/useSVMTransfer";

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

const WalletConnectConfigContext: React.Context<WalletConnectConfig | null> = createContext<WalletConnectConfig | null>(null);

export const useWalletConnectConfig: () => WalletConnectConfig | null = () => useContext(WalletConnectConfigContext);

export function createSVMProvider(config: SVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
                <Suspense fallback={null}>
                    <SVMProviderWrapper>
                        {children}
                    </SVMProviderWrapper>
                </Suspense>
            </WalletConnectConfigContext.Provider>
        );
    };

    const walletConnectionProvider = customHook || useSVMConnection;

    const defaultBalanceProviders = [new SolanaBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.Solana,
            () => import("./svmGasProvider").then(m => new m.SolanaGasProvider())
        )
    ];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new SolanaAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultTransferProviders = [useSVMTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "solana",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createSVMProvider() instead. This export will be removed in a future version.
 * Note: This uses default WalletConnect configuration provided to LayerswapProvider.
 */
export const SVMProvider: WalletProvider = {
    id: "solana",
    wrapper: ({ children }: { children: React.ReactNode }) => {
        return (
            <WalletConnectConfigContext.Provider value={AppSettings.WalletConnectConfig ?? null}>
                <Suspense fallback={null}>
                    <SVMProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                        {children}
                    </SVMProviderWrapper>
                </Suspense>
            </WalletConnectConfigContext.Provider>
        );
    },
    walletConnectionProvider: useSVMConnection,
    addressUtilsProvider: [new SolanaAddressUtilsProvider()],
    gasProvider: [
        new LazyGasProvider(
            (n) => n.type === NetworkType.Solana,
            () => import("./svmGasProvider").then(m => new m.SolanaGasProvider())
        )
    ],
    balanceProvider: [new SolanaBalanceProvider()],
    transferProvider: [useSVMTransfer],
};