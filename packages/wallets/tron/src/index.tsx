import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types";
import { TronGasProvider } from "./tronGasProvider";
import TronProviderWrapper from "./TronProvider";
import useTronConnection from "./useTronConnection";
import React from "react";
import { useTronTransfer } from "./transferProvider/useTronTransfer";
import { KnownInternalNames } from "@layerswap/widget/internal";

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <TronProviderWrapper>
                {children}
            </TronProviderWrapper>
        );
    };

    const walletConnectionProvider = customHook || useTronConnection;

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new TronGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultTransferProviders = [useTronTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "tron",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createTronProvider() instead. This export will be removed in a future version.
 */
export const TronProvider: WalletProvider = {
    id: "tron",
    wrapper: TronProviderWrapper,
    walletConnectionProvider: useTronConnection,
    gasProvider: [new TronGasProvider()],
    balanceProvider: [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.TronMainnet.includes(n.name),
            () => import("./tronBalanceProvider").then(m => new m.TronBalanceProvider())
        )
    ],
    transferProvider: [useTronTransfer],
};