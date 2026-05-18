'use client'
// Legacy createEVMProvider / EVMProvider factory + deprecated singleton.
// Lives in its own file so importing `createEVMShell` from the package
// barrel does NOT statically pull useEVMConnection / useEVMTransfer /
// EVMContractAddressProvider / EVMRpcHealthCheckProvider into the bundle.
// Consumers that still need createEVMProvider (e.g. custom-hook
// integrations) import this file directly and accept the bundle cost
// for those modules.
import { WalletProvider, BaseWalletProviderConfig, WalletProviderModule, LazyBalanceProvider, LazyGasProvider, NetworkType } from "@layerswap/widget/types"
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal"
import { ReactNode, Suspense, type JSX } from "react"
import useEVMConnection from "./useEVMConnection"
import { useEVMTransfer } from "./transferProvider/useEVMTransfer"
import { EVMAddressUtilsProvider } from "./evmAddressUtilsProvider"
import { EVMContractAddressProvider } from "./evmContractAddressProvider"
import { EVMRpcHealthCheckProvider } from "./rpcHealthCheckProvider"
import { EVMProviderWrapper, WalletConnectConfigContext, type EVMProviderConfig } from "./shellInternals"

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

    const WrapperComponent = ({ children }: { children: ReactNode }) => {
        return (
            <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
                <Suspense fallback={null}>
                    <EVMProviderWrapper>
                        {children}
                    </EVMProviderWrapper>
                </Suspense>
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

    const defaultTransferProviders = [useEVMTransfer];
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

/**
 * @deprecated Use createEVMShell() (lazy chunk path) or createEVMProvider() (legacy
 * static path) instead. This export will be removed in a future version.
 */
export const EVMProvider: WalletProvider = {
    id: "evm",
    wrapper: ({ children }: { children: JSX.Element | JSX.Element[] }) => {
        return (
            <WalletConnectConfigContext.Provider value={AppSettings.WalletConnectConfig ?? null}>
                <Suspense fallback={null}>
                    <EVMProviderWrapper>
                        {children}
                    </EVMProviderWrapper>
                </Suspense>
            </WalletConnectConfigContext.Provider>
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
    transferProvider: [useEVMTransfer],
    contractAddressProvider: [new EVMContractAddressProvider()],
    rpcHealthCheckProvider: [new EVMRpcHealthCheckProvider()],
};
