import { createStore, type StoreApi } from "zustand/vanilla"
import type { WalletConnectionProvider, WalletProviderDescriptor } from "@/types"

/**
 * Builds a synthetic connection-store for a descriptor whose real provider
 * has not been loaded yet. Carries only the static capability metadata so
 * the route filter and registry consumers see the provider as "known but
 * not ready". Connecting/signing fields are intentionally absent — callers
 * that need them must wait for the real connection store to replace this
 * stub.
 */
export function createDescriptorStubStore(
    d: WalletProviderDescriptor,
): StoreApi<WalletConnectionProvider> {
    return createStore<WalletConnectionProvider>(() => ({
        id: d.id,
        name: d.name ?? d.id,
        providerIcon: d.providerIcon,
        autofillSupportedNetworks: d.autofillSupportedNetworks,
        withdrawalSupportedNetworks: d.withdrawalSupportedNetworks ?? [],
        asSourceSupportedNetworks: d.asSourceSupportedNetworks,
        unsupportedPlatforms: d.unsupportedPlatforms,
        hideFromList: d.hideFromList,
        connectedWallets: undefined,
        activeWallet: undefined,
        connectWallet: () => undefined,
        ready: false,
        isStub: true,
        pendingSessionRestore: d.hasPersistedSession?.() === true,
    }))
}
