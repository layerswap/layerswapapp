import { useCallback, useRef } from "react";
import { useWalletProvidersRegistry } from "@/context/walletProviders";
import { connectorKey, resolveChainConnectors } from "@/hooks/useConnectors";
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader";
import {
    ensureRegistryBrowseLoaded,
    getInstantiatedAdditionalConnectorsStores,
    subscribeAdditionalConnectorsStores,
} from "@/lib/walletConnect";
import type {
    WalletConnectionProvider,
    WalletModalConnector,
} from "@/types/wallet";

export function useWalletProviderReadiness(
    featuredProviders: WalletConnectionProvider[]
) {
    const registry = useWalletProvidersRegistry()
    const { loadAll, loadById } = useWalletDescriptorLoader()
    const featuredProvidersRef = useRef(featuredProviders)

    featuredProvidersRef.current = featuredProviders

    // Resolve variants from current external-store state so click-time
    // decisions use the same provider pool as the rendered connector grid.
    const getLiveVariants = useCallback((connector: WalletModalConnector) => {
        const allowedProviderNames = new Set(
            featuredProvidersRef.current.map(provider => provider.name)
        )
        const providerStates = registry.getEntries()
            .map(entry => entry.store.getState())
            .filter(provider => allowedProviderNames.has(provider.name))
        const connectorPool = [
            connector,
            ...providerStates.flatMap(provider => (
                [
                    ...(provider.availableConnectors ?? []),
                    ...(provider.additionalConnectors ?? []),
                ].map(item => ({ ...item, providerName: provider.name }))
            )),
        ]

        return resolveChainConnectors(connectorPool, providerStates)
            .get(connectorKey(connector.name))
            ?.variants ?? []
    }, [registry])

    const isRegistrySettled = useCallback(() => (
        getInstantiatedAdditionalConnectorsStores().every(store => {
            const status = store.getSnapshot().browseMetadata.status
            return status === "ready" || status === "error"
        })
    ), [])

    const areSourcesStillLoading = useCallback(() => (
        registry.getEntries().some(entry => {
            const state = entry.store.getState()
            return state.isStub || !state.ready
        }) || !isRegistrySettled()
    ), [isRegistrySettled, registry])

    // Wait until descriptors, live providers, and registry page-one requests
    // settle. The timeout prevents a broken SDK or request from hanging a
    // wallet connection indefinitely.
    const awaitProvidersSettled = useCallback(async (timeoutMs = 3000) => {
        await loadAll()
        ensureRegistryBrowseLoaded()

        const settled = () => (
            registry.getEntries().every(entry => {
                const provider = entry.store.getState()
                return !provider.isStub && provider.ready
            }) && isRegistrySettled()
        )
        if (settled()) return

        await new Promise<void>(resolve => {
            let unsubscribe: (() => void)[] = []
            const finish = () => {
                clearTimeout(timer)
                unsubscribe.forEach(callback => callback())
                resolve()
            }
            const timer = setTimeout(finish, timeoutMs)
            const check = () => {
                ensureRegistryBrowseLoaded()
                if (settled()) finish()
            }

            unsubscribe = [
                registry.subscribe(check),
                subscribeAdditionalConnectorsStores(check),
            ]
        })
    }, [isRegistrySettled, loadAll, registry])

    // A registry-derived tile can still reference a metadata-only provider
    // stub. Hydrate it and wait for the live provider before connecting.
    const awaitLiveProvider = useCallback(async (
        providerId: string,
        timeoutMs = 5000
    ): Promise<WalletConnectionProvider | undefined> => {
        void loadById(providerId)

        const getLiveProvider = () => {
            const provider = registry.getEntries()
                .find(entry => entry.id === providerId)
                ?.store.getState()
            return provider && !provider.isStub && provider.ready
                ? provider
                : undefined
        }
        const currentProvider = getLiveProvider()
        if (currentProvider) return currentProvider

        return new Promise(resolve => {
            let unsubscribe = () => { }
            const finish = () => {
                clearTimeout(timer)
                unsubscribe()
                resolve(getLiveProvider())
            }
            const timer = setTimeout(finish, timeoutMs)
            unsubscribe = registry.subscribe(() => {
                if (getLiveProvider()) finish()
            })
        })
    }, [loadById, registry])

    return {
        areSourcesStillLoading,
        awaitLiveProvider,
        awaitProvidersSettled,
        getLiveVariants,
    }
}
