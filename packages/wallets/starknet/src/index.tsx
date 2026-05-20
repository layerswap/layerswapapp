import StarknetProviderWrapper from "./StarknetProvider";
import useStarknetConnection from "./useStarknetConnection";
import { StarknetBalanceProvider } from "./starknetBalanceProvider";
import { WalletProvider, BaseWalletProviderConfig, NftProvider, LazyGasProvider } from "@layerswap/widget/types";
import { AppSettings, KnownInternalNames } from "@layerswap/widget/internal";
import { StarknetAddressUtilsProvider } from "./starknetAddressUtilsProvider";
import { StarknetNftProvider } from "./starknetNftProvider";
import React from "react";
import { useStarknetTransfer } from "./useStarknetTransfer";

const isStarknetNetwork = (name: string) =>
    KnownInternalNames.Networks.StarkNetMainnet.includes(name) ||
    KnownInternalNames.Networks.StarkNetGoerli.includes(name) ||
    KnownInternalNames.Networks.StarkNetSepolia.includes(name);

export type StarknetProviderConfig = BaseWalletProviderConfig & {
    nftProviders?: NftProvider | NftProvider[]
}

export { default as useStarknetConnection } from "./useStarknetConnection";

export function createStarknetProvider(config: StarknetProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        nftProviders,
        transferProviders
    } = config;

    // Use custom hook if provided, otherwise use default
    const walletConnectionProvider = customHook || useStarknetConnection;

    // Use custom providers if provided, otherwise use defaults
    const defaultBalanceProviders = [new StarknetBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        )
    ];
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

    const defaultTransferProviders = [useStarknetTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "starknet",
        wrapper: StarknetProviderWrapper,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        nftProvider: finalNftProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createStarknetProvider() instead. This export will be removed in a future version.
 * Note: This uses default WalletConnect configuration provided to LayerswapProvider.
 */
export const StarknetProvider: WalletProvider = {
    id: "starknet",
    wrapper: ({ children }: { children: React.ReactNode }) => {
        return (
            <StarknetProviderWrapper walletConnectConfigs={AppSettings.WalletConnectConfig}>
                {children}
            </StarknetProviderWrapper>
        );
    },
    walletConnectionProvider: useStarknetConnection,
    addressUtilsProvider: [new StarknetAddressUtilsProvider()],
    gasProvider: [
        new LazyGasProvider(
            (n) => isStarknetNetwork(n.name),
            () => import("./starknetGasProvider").then(m => new m.StarknetGasProvider())
        )
    ],
    balanceProvider: [new StarknetBalanceProvider()],
    nftProvider: [new StarknetNftProvider()],
    transferProvider: [useStarknetTransfer],
};