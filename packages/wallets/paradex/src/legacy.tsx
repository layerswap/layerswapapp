'use client'
// Legacy createParadexProvider / ParadexProvider factory + deprecated
// singleton. Lives in its own file so importing `createParadexShell`
// from the package barrel does NOT statically pull useParadexConnection
// (and its wagmi + ethers dependencies) into the bundle. Consumers that
// still need createParadexProvider import this file directly and accept
// the bundle cost.
import { useParadexConnection } from "./useParadexConnection"
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount"
import { WalletProvider, BaseWalletProviderConfig, LazyBalanceProvider } from "@layerswap/widget/types"
import { KnownInternalNames } from "@layerswap/widget/internal"

export type ParadexProviderConfig = BaseWalletProviderConfig

export function createParadexProvider(config: ParadexProviderConfig = {}): WalletProvider {
    const {
        customHook,
        balanceProviders,
        gasProviders,
        addressUtilsProviders,
    } = config

    const walletConnectionProvider = customHook || useParadexConnection

    const defaultBalanceProviders = [
        new LazyBalanceProvider(
            (n) => KnownInternalNames.Networks.ParadexMainnet.includes(n.name) || KnownInternalNames.Networks.ParadexTestnet.includes(n.name),
            () => import("./paradexBalanceProvider").then(m => new m.ParadexBalanceProvider())
        ),
    ]
    const finalBalanceProviders = balanceProviders !== undefined
        ? (Array.isArray(balanceProviders) ? balanceProviders : [balanceProviders])
        : defaultBalanceProviders

    const finalGasProviders = gasProviders !== undefined
        ? (Array.isArray(gasProviders) ? gasProviders : [gasProviders])
        : undefined

    const finalAddressUtilsProviders = addressUtilsProviders !== undefined
        ? (Array.isArray(addressUtilsProviders) ? addressUtilsProviders : [addressUtilsProviders])
        : undefined

    return {
        id: "paradex",
        wrapper: ActiveParadexAccountProvider,
        walletConnectionProvider,
        addressUtilsProvider: finalAddressUtilsProviders,
        gasProvider: finalGasProviders,
    }
}

/**
 * @deprecated Use createParadexShell() (lazy chunk path) or createParadexProvider()
 * (legacy static path) instead. This export will be removed in a future version.
 */
export const ParadexProvider: WalletProvider = {
    id: "paradex",
    wrapper: ActiveParadexAccountProvider,
    walletConnectionProvider: useParadexConnection,
}
