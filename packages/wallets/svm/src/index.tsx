import { WalletProvider, BaseWalletProviderConfig, LazyGasProvider, NetworkType } from "@layerswap/widget/types";
import SVMProviderWrapper from "./SVMProvider";
import { SolanaBalanceProvider } from "./svmBalanceProvider";
import { SolanaAddressUtilsProvider } from "./svmAddressUtilsProvider";
import React, { createContext, useContext } from "react";
import { useSVMTransfer } from "./transferProvider/useSVMTransfer";
import { svmConnectionAdapter } from "./service/svmConnectionAdapter";

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
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <WalletConnectConfigContext.Provider value={walletConnectConfigs ?? null}>
                <SVMProviderWrapper>
                    {children}
                </SVMProviderWrapper>
            </WalletConnectConfigContext.Provider>
        );
    };

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
        createConnection: customConnection ?? svmConnectionAdapter.createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}
