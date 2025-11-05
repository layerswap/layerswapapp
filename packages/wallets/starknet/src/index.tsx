import StarknetProviderWrapper from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { StarknetGasProvider } from "./starknetGasProvider";
import { WalletProvider, BaseWalletProviderConfig, NftProvider } from "@layerswap/widget/types";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";
import { StarknetNftProvider } from "./starknetNftProvider";
import React from "react";

export type WalletConnectConfig = {
    projectId: string
    name: string
    description: string
    url: string
    icons: string[]
}

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    walletConnectConfigs?: WalletConnectConfig
    nftProviders?: NftProvider | NftProvider[]
}

export { default as useStarknetConnection } from "./useStarknetConnection";

export function createStarknetProvider(config: StarknetProviderConfig = {}): WalletProvider {
    const {
        walletConnectConfigs,
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        nftProviders
    } = config;

    // Create wrapper component with config bound
    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <StarknetProviderWrapper walletConnectConfigs={walletConnectConfigs}>
                {children}
            </StarknetProviderWrapper>
        );
    };

    // Use custom hook if provided, otherwise use default
    const walletConnectionProvider = customHook || useStarknetConnection;

    // Use custom providers if provided, otherwise use defaults
    const defaultBalanceProviders = [new StarknetBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new StarknetGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new StarknetAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultNftProviders = [new StarknetNftProvider()];
    const finalNftProviders = nftProviders !== undefined
        ? (Array.isArray(nftProviders) ? nftProviders : [nftProviders])
        : defaultNftProviders;

    return {
        id: "starknet",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        nftProvider: finalNftProviders,
    };
}