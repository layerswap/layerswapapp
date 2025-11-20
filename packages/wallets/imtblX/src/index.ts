import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { ImmutableXBalanceProvider } from "./immutableXBalanceProvider";
import { ImmutableXGasProvider } from "./immutableXGasProvider";
import useImtblXConnection from "./useImtblX";

export type ImmutableXProviderConfig = BaseWalletProviderConfig

export function createImmutableXProvider(config: ImmutableXProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders
    } = config;

    const walletConnectionProvider = customHook || useImtblXConnection;

    const defaultBalanceProviders = [new ImmutableXBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new ImmutableXGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : undefined;

    return {
        id: "imx",
        wrapper: undefined,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
    };
}

/**
 * @deprecated Use createImmutableXProvider() instead. This export will be removed in a future version.
 */
export const ImmutableXProvider: WalletProvider = {
    id: "imx",
    walletConnectionProvider: useImtblXConnection,
    gasProvider: [new ImmutableXGasProvider()],
    balanceProvider: [new ImmutableXBalanceProvider()],
};