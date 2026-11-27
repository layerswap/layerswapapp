import type { LayerswapNetwork } from '@layerswap/widget-types'
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
    networks: LayerswapNetwork[] = [],
): StoreApi<WalletConnectionProvider> {
    const supportedNetworks = d.supportedNetworkTypes
        ? networks.filter(network => d.supportedNetworkTypes?.includes(network.type)).map(network => network.name)
        : undefined
    return createStore<WalletConnectionProvider>(() => ({
        id: d.id,
        name: d.name ?? d.id,
        capabilities: d.capabilities,
        providerIcon: d.providerIcon,
        autofillSupportedNetworks: d.autofillSupportedNetworks ?? supportedNetworks,
        withdrawalSupportedNetworks: d.withdrawalSupportedNetworks ?? supportedNetworks ?? [],
        asSourceSupportedNetworks: d.asSourceSupportedNetworks ?? supportedNetworks,
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
