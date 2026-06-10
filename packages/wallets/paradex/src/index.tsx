import { WalletProvider, BaseWalletProviderConfig } from "@layerswap/widget/types"
import { ParadexBalanceProvider } from "./paradexBalanceProvider"
import { useParadexConnection } from "./useParadexConnection"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders
    } = config;

    const walletConnectionProvider = customHook || useParadexConnection;

    const defaultBalanceProviders = [new ParadexBalanceProvider()];
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders;

    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : undefined;

    return {
        id: "paradex",
        wrapper: ActiveParadexAccountProvider,
        walletConnectionProvider,
        gasProvider: finalGasProviders,
        // balanceProvider: finalBalanceProviders,
    };
}

export { default as ParadexMultiStepHandler } from "./components/ParadexMultiStepHandler"

/**
 * @deprecated Use createParadexProvider() instead. This export will be removed in a future version.
 */
export const ParadexProvider: WalletProvider = {
    id: "paradex",
    wrapper: ActiveParadexAccountProvider,
    walletConnectionProvider: useParadexConnection,
    // balanceProvider: [new ParadexBalanceProvider()]
};