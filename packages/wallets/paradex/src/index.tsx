import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"
import { paradexConnectionAdapter } from "./service/paradexConnectionAdapter"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customConnection,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
    } = config;

    const defaultBalanceProviders = [new ParadexBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : undefined;

    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : undefined;

    return {
        id: "paradex",
        wrapper: ActiveParadexAccountProvider,
        createConnection: customConnection ?? paradexConnectionAdapter.createConnection,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
        // balanceProvider: finalBalanceProviders,
    };
}

export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"
