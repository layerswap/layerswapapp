'use client'
import { WalletProvider, BaseWalletProviderConfig, WalletProviderModule, LazyBalanceProvider, LazyGasProvider, NetworkType } from "@layerswap/widget/types";
import type { JSX } from 'react';
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { useEVMTransfer } from "./transferProvider/useEVMTransfer";
import { useTempoTransfer } from "./transferProvider/useTempoTransfer";
import { EVMContractAddressProvider } from "./evmContractAddressProvider";
import { EVMRpcHealthCheckProvider } from "./rpcHealthCheckProvider";

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
        addressUtilsProviders,
        transferProviders,
        contractAddressProviders,
        rpcHealthCheckProviders
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
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./balanceProviders/evmBalanceProvider").then(m => new m.EVMBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.name === KnownInternalNames.Networks.HyperliquidMainnet || n.name === KnownInternalNames.Networks.HyperliquidTestnet,
            () => import("./balanceProviders/hyperliquidBalanceProvider").then(m => new m.HyperliquidBalanceProvider())
        ),
        ...moduleBalanceProviders,
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./gasProviders/evmGasProvider").then(m => new m.EVMGasProvider())
        ),
        ...moduleGasProviders,
    ];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new EVMAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultContractAddressProviders = [new EVMContractAddressProvider()];
    const finalContractAddressProviders = contractAddressProviders !== undefined
        ? (Array.isArray(contractAddressProviders) ? contractAddressProviders : [contractAddressProviders])
        : defaultContractAddressProviders;

    const defaultTransferProviders = [useTempoTransfer, useEVMTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    const defaultRPCHealtCheckProviders = [new EVMRpcHealthCheckProvider()];
    const finalRPCHealtCheckProviders = rpcHealthCheckProviders !== undefined
        ? (Array.isArray(rpcHealthCheckProviders) ? rpcHealthCheckProviders : [rpcHealthCheckProviders])
        : defaultRPCHealtCheckProviders;

    return {
        id: "evm",
        wrapper: WrapperComponent,
        walletConnectionProvider: walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
        contractAddressProvider: finalContractAddressProviders,
        rpcHealthCheckProvider: finalRPCHealtCheckProviders,
    };
}

export { default as useEVMConnection } from "./useEVMConnection";
export { useChainConfigs } from "./evmUtils/chainConfigs";

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
    gasProvider: [new LazyGasProvider(
        (n) => n.type === NetworkType.EVM && !!n.token,
        () => import("./gasProviders/evmGasProvider").then(m => new m.EVMGasProvider())
    )],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./balanceProviders/evmBalanceProvider").then(m => new m.EVMBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.name === KnownInternalNames.Networks.HyperliquidMainnet || n.name === KnownInternalNames.Networks.HyperliquidTestnet,
            () => import("./balanceProviders/hyperliquidBalanceProvider").then(m => new m.HyperliquidBalanceProvider())
        ),
    ],
    transferProvider: [useTempoTransfer, useEVMTransfer],
    contractAddressProvider: [new EVMContractAddressProvider()],
    rpcHealthCheckProvider: [new EVMRpcHealthCheckProvider()],
};