import type { WalletConnectionProvider } from "@/types/wallet"

/**
 * Upper bound on how long a caller should wait for a provider to hydrate before
 * degrading gracefully. Shared so the connect modal's bounded wait and the
 * entry-point buttons that lead into it can't drift apart.
 */
export const PROVIDER_HYDRATION_TIMEOUT_MS = 5000

/**
 * Whether a provider is far enough along to offer a connect affordance. Fails
 * *open*: an absent provider and a descriptor stub both count as ready, because
 * a stub hydrates on demand once the user acts.
 */
export function isProviderConnectReady(provider: WalletConnectionProvider | undefined): boolean {
    if (!provider) return true
    return provider.isStub === true || (typeof provider.ready === "boolean" ? provider.ready : true)
}

/**
 * Whether a provider is live and initialized — its SDK has loaded and its
 * adapter has published resolved connectors. Fails *closed* (the opposite of
 * {@link isProviderConnectReady}): use this before acting on a connector, where
 * a stub has nothing to resolve yet.
 */
export function isProviderHydrated(provider: WalletConnectionProvider | undefined): provider is WalletConnectionProvider {
    if (!provider) return false
    return provider.isStub !== true && provider.ready === true
}
