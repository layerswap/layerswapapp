'use client'
import { WalletProvider, BaseWalletProviderConfig, WalletProviderModule } from "@layerswap/widget/types";
import { EVMBalanceProvider, HyperliquidBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { EVMGasProvider } from "./gasProviders"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"
import { AppSettings } from "@layerswap/widget/internal";

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type EVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
    walletProviderModules?: WalletProviderModule[]
}

export function createEVMProvider(config: EVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        walletProviderModules,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders
    } = config;

    const WrapperComponent = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
        return (
            <EVMProviderWrapper walletConnectConfigs={walletConnectConfigs}>
                {children}
            </EVMProviderWrapper>
        );
    };

    const baseWalletConnectionProvider = customHook || useEVMConnection;

    const moduleMultiStepHandlers = walletProviderModules
        ?.map(m => m.multiStepHandler)
        .filter(h => h !== undefined) || [];

    const walletConnectionProvider = (props: any) => {
        const provider = baseWalletConnectionProvider(props);
        return {
            ...provider,
            multiStepHandlers: [
                ...(provider.multiStepHandlers || []),
                ...moduleMultiStepHandlers,
            ],
        };
    };

    const moduleBalanceProviders = walletProviderModules
        ?.map(m => m.balanceProvider)
        .filter(p => p !== undefined) || [];

    const moduleGasProviders = walletProviderModules
        ?.map(m => m.gasProvider)
        .filter(p => p !== undefined) || [];

    const defaultBalanceProviders = [
        new EVMBalanceProvider(),
        new HyperliquidBalanceProvider(),
        ...moduleBalanceProviders,
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new EVMGasProvider(),
        ...moduleGasProviders,
    ];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new EVMAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    return {
        id: "evm",
        wrapper: WrapperComponent,
        walletConnectionProvider: walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
    };
}

export { default as useEVMConnection } from "./useEVMConnection";

/**
 * @deprecated Use createEVMProvider() instead. This export will be removed in a future version.
 * Note: This uses default WalletConnect configuration provided to LayerswapProvider.
 */
export const EVMProvider: WalletProvider = {
    id: "evm",
    wrapper: ({ children }: { children: JSX.Element | JSX.Element[] }) => {
        return (
            <EVMProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                {children}
            </EVMProviderWrapper>
        );
    },
    walletConnectionProvider: useEVMConnection,
    addressUtilsProvider: [new EVMAddressUtilsProvider()],
    gasProvider: [new EVMGasProvider()],
    balanceProvider: [new EVMBalanceProvider(), new HyperliquidBalanceProvider()],
};