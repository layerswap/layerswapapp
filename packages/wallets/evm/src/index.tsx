'use client'
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { EVMBalanceProvider, HyperliquidBalanceProvider } from "./balanceProviders"
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { EVMGasProvider } from "./gasProviders"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type EVMProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
}

export function createEVMProvider(config: EVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
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

    const walletConnectionProvider = customHook || useEVMConnection;

    const defaultBalanceProviders = [
        new EVMBalanceProvider(),
        new HyperliquidBalanceProvider(),
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new EVMGasProvider(),
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
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
    };
}

export { default as useEVMConnection } from "./useEVMConnection";