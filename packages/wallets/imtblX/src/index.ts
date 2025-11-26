import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { ImmutableXBalanceProvider } from "./immutableXBalanceProvider";
import { ImmutableXGasProvider } from "./immutableXGasProvider";
import useImtblXConnection from "./useImtblX";
import { useImmutableXTransfer } from "./useImmutableXTransfer"

export type ImmutableXProviderConfig = BaseWalletProviderConfig

export function createImmutableXProvider(config: ImmutableXProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders
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

    const defaultTransferProviders = [useImmutableXTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "imx",
        wrapper: undefined,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
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
    transferProvider: [useImmutableXTransfer],
};