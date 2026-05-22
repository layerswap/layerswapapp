import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types";
import { BitcoinProvider as BitcoinProviderWrapper } from "./BitcoinProvider";
import { BitcoinGasProvider } from "./bitcoinGasProvider";
import { BitcoinBalanceProvider } from "./bitcoinBalanceProvider";
import { BitcoinAddressUtilsProvider } from "./bitcoinAddressUtilsProvider";
import { useBitcoinTransfer } from "./transferProvider/useBitcoinTransfer";
import { bitcoinConnectionAdapter } from "./service/bitcoinConnectionAdapter";

export type BitcoinProviderConfig = BaseWalletProviderConfig

export function createBitcoinProvider(config: BitcoinProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config;

    const defaultBalanceProviders = [new BitcoinBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const defaultGasProviders = [new BitcoinGasProvider()];
    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : defaultGasProviders;

    const defaultAddressUtilsProviders = [new BitcoinAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultTransferProviders = [useBitcoinTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "bitcoin",
        wrapper: BitcoinProviderWrapper,
        createConnection: customConnection ?? bitcoinConnectionAdapter.createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}
