import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types";
import { TronGasProvider } from "./tronGasProvider";
import TronProviderWrapper from "./TronProvider";
import { TronAddressUtilsProvider } from "./tronAddressUtilsProvider";
import { useTronTransfer } from "./transferProvider/useTronTransfer";
import { KnownInternalNames } from "@layerswap/widget/internal";
import { tronConnectionAdapter } from "./service/tronConnectionAdapter";

export type TronProviderConfig = BaseWalletProviderConfig

export function createTronProvider(config: TronProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
        transferProviders,
    } = config;

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

    const defaultAddressUtilsProviders = [new TronAddressUtilsProvider()];
    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : defaultAddressUtilsProviders;

    const defaultTransferProviders = [useTronTransfer];
    const finalTransferProviders = transferProviders !== undefined
        ? (Array.isArray(transferProviders) ? transferProviders : [transferProviders])
        : defaultTransferProviders;

    return {
        id: "tron",
        wrapper: TronProviderWrapper,
        createConnection: customConnection ?? tronConnectionAdapter.createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        balanceProvider: finalBalanceProviders,
        transferProvider: finalTransferProviders,
    };
}
