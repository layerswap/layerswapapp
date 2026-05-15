import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"
import { useParadexConnection } from "./useParadexConnection"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders
    } = config;

    const walletConnectionProvider = customHook || useParadexConnection;

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.ParadexMainnet.includes(n.name) || KnownInternalNames.Networks.ParadexTestnet.includes(n.name),
            () => import("./paradexBalanceProvider").then(m => new m.ParadexBalanceProvider())
        )
    ];
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
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
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
    // balanceProvider: [new LazyBalanceProvider(...)] // see createParadexProvider for lazy variant
};
import { defineWalletProvider, type WalletProviderShell } from "@layerswap/widget/internal";

export function createParadexShell(config: ParadexProviderConfig & { order?: number } = {}): WalletProviderShell {
    const { order = 400, ...rest } = config
    const provider = createParadexProvider(rest)
    return defineWalletProvider({
        id: provider.id,
        order,
        wrapper: provider.wrapper as React.ComponentType<{ children: React.ReactNode }>,
        walletConnectionProvider: provider.walletConnectionProvider,
        transferProvider: provider.transferProvider,
        balanceProvider: provider.balanceProvider,
        gasProvider: provider.gasProvider,
        addressUtilsProvider: provider.addressUtilsProvider,
        contractAddressProvider: provider.contractAddressProvider,
        rpcHealthCheckProvider: provider.rpcHealthCheckProvider,
    })
}
