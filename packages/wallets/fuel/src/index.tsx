import { FuelBalanceProvider } from "./fuelBalanceProvider";
import { FuelGasProvider } from "./fuelGasProvider";
import FuelProviderWrapper from "./FuelProvider";
import useFuelConnection from "./useFuelConnection";
import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import React from "react";
import { useFuelTransfer } from "./transferProvider/useFuelTransfer";

export type FuelProviderConfig = BaseWalletProviderConfig

export function createFuelProvider(config: FuelProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        transferProviders
    } = config;

    const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
        return (
            <FuelProviderWrapper>
                {children}
            </FuelProviderWrapper>
        );
    };

    const walletConnectionProvider = customHook || useFuelConnection;

    const defaultBalanceProviders = [new FuelBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new FuelGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultTransferProviders = [useFuelTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "fuel",
        wrapper: WrapperComponent,
        walletConnectionProvider,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}

/**
 * @deprecated Use createFuelProvider() instead. This export will be removed in a future version.
 */
export const FuelProvider: WalletProvider = {
    id: "fuel",
    wrapper: FuelProviderWrapper,
    walletConnectionProvider: useFuelConnection,
    gasProvider: [new FuelGasProvider()],
    balanceProvider: [new FuelBalanceProvider()],
    transferProvider: [useFuelTransfer],
};