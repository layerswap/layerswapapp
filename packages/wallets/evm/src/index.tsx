'use client'
import { WalletProvider, BaseWalletProviderConfig, WalletProviderModule, LazyBalanceProvider, LazyGasProvider, NetworkType } from "@layerswap/widget/types";
import { createContext, ReactNode, useContext, type JSX } from 'react';
import useEVMConnection from "./useEVMConnection"
import EVMProviderWrapper from "./EVMProvider"
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { useEVMTransfer } from "./transferProvider/useEVMTransfer";
import { EVMContractAddressProvider } from "./evmContractAddressProvider";
import { EVMRpcHealthCheckProvider } from "./rpcHealthCheckProvider";
import { hyperliquidProvider } from "./additionalProviders/hyperliquid/hyperliquidExtendedRouteProvider";
import { useHyperliquidTransfer } from "./additionalProviders/hyperliquid/useHyperliquidTransfer";
import { polymarketProvider } from "./additionalProviders/polymarket/polymarketExtendedRouteProvider";
import { usePolymarketTransfer } from "./additionalProviders/polymarket/usePolymarketTransfer";
import { useEVMGaslessSign } from "./gaslessProvider/useEVMGaslessSign";

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

const WalletConnectConfigContext = createContext<WalletConnectConfig | null>(null);

export const useWalletConnectConfig = () => useContext(WalletConnectConfigContext);

export function createEVMProvider(config: EVMProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        walletProviderModules,
        customHook,
        balanceProviders,
        gasProviders,
        transferProviders,
        gaslessProviders,
        contractAddressProviders,
        rpcHealthCheckProviders
    } = config;

    const WrapperComponent = ({ children }: { children: ReactNode }) => {
        return (
            <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
                <EVMProviderWrapper >
                    {children}
                </EVMProviderWrapper>
            </WalletConnectConfigContext.Provider>
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
            () => import("./balanceProviders").then(m => new m.EVMBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.Hyperliquid,
            () => import("./balanceProviders").then(m => new m.HyperliquidBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.Polymarket,
            () => import("./balanceProviders").then(m => new m.PolymarketBalanceProvider())
        ),
        ...moduleBalanceProviders,
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./gasProviders").then(m => new m.EVMGasProvider())
        ),
        new LazyGasProvider(
            (n) => n.type === NetworkType.Hyperliquid && !!n.token,
            () => import("./gasProviders").then(m => new m.HyperliquidGasProvider())
        ),
        ...moduleGasProviders,
    ];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultContractAddressProviders = [new EVMContractAddressProvider()];
    const finalContractAddressProviders = contractAddressProviders !== undefined
        ? (Array.isArray(contractAddressProviders) ? contractAddressProviders : [contractAddressProviders])
        : defaultContractAddressProviders;

    // Hyperliquid/Polymarket are standard transferProviders (each matched by its own
    // NetworkType via supportsNetwork); useEVMTransfer only matches NetworkType.EVM, so order is safe.
    const defaultTransferProviders = [useEVMTransfer, useHyperliquidTransfer, usePolymarketTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    // Gasless (sign-to-deposit) is currently EVM-only; future chains register their own
    // GaslessProvider here and the GaslessResolver picks by network — same pattern as transfers.
    const defaultGaslessProviders = [useEVMGaslessSign];
    const finalGaslessProviders = gaslessProviders !== undefined
        ? (Array.isArray(gaslessProviders) ? gaslessProviders : [gaslessProviders])
        : defaultGaslessProviders;

    const defaultRPCHealtCheckProviders = [new EVMRpcHealthCheckProvider()];
    const finalRPCHealtCheckProviders = rpcHealthCheckProviders !== undefined
        ? (Array.isArray(rpcHealthCheckProviders) ? rpcHealthCheckProviders : [rpcHealthCheckProviders])
        : defaultRPCHealtCheckProviders;

    return {
        id: "evm",
        wrapper: WrapperComponent,
        walletConnectionProvider: walletConnectionProvider,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
        gaslessProvider: finalGaslessProviders,
        contractAddressProvider: finalContractAddressProviders,
        rpcHealthCheckProvider: finalRPCHealtCheckProviders,
        extendedRouteProvider: [hyperliquidProvider, polymarketProvider],
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
            <WalletConnectConfigContext.Provider value={AppSettings.WalletConnectConfig ?? null}>
                <EVMProviderWrapper>
                    {children}
                </EVMProviderWrapper>
            </WalletConnectConfigContext.Provider>
        );
    },
    walletConnectionProvider: useEVMConnection,
    gasProvider: [
        new LazyGasProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./gasProviders").then(m => new m.EVMGasProvider()),
        ),
        new LazyGasProvider(
            (n) => n.type === NetworkType.Hyperliquid && !!n.token,
            () => import("./gasProviders").then(m => new m.HyperliquidGasProvider()),
        )
    ],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.EVM && !!n.token,
            () => import("./balanceProviders").then(m => new m.EVMBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.Hyperliquid,
            () => import("./balanceProviders").then(m => new m.HyperliquidBalanceProvider())
        ),
        new LazyBalanceProvider(
            (n) => n.type === NetworkType.Polymarket,
            () => import("./balanceProviders").then(m => new m.PolymarketBalanceProvider())
        ),
    ],
    transferProvider: [useEVMTransfer, useHyperliquidTransfer, usePolymarketTransfer],
    gaslessProvider: [useEVMGaslessSign],
    contractAddressProvider: [new EVMContractAddressProvider()],
    rpcHealthCheckProvider: [new EVMRpcHealthCheckProvider()],
    extendedRouteProvider: [hyperliquidProvider, polymarketProvider],
};