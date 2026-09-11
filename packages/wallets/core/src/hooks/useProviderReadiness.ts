"use client";
import { useCallback, useEffect, useRef, useState } from "react"
import { isMobile } from "@layerswap/utils"
import type { WalletConnectionProvider } from "@/types/wallet"
import type { WalletModalConnector } from "@/types/provider"
import { useWalletProvidersReady, useWalletProvidersRegistry } from "@/context/WalletProvidersRegistryProvider"
import { useWalletProviderSnapshots } from "@/hooks/useWalletProviderSnapshots"
import { connectorKey, resolveChainConnectors } from "@/hooks/useConnectors"
import { isProviderConnectReady, isProviderHydrated, PROVIDER_HYDRATION_TIMEOUT_MS } from "@/lib/providerReadiness"
import { ensureRegistryBrowseLoaded, getInstantiatedAdditionalConnectorsStores, subscribeAdditionalConnectorsStores } from "@/lib/walletConnect/additionalConnectorsStore"
import { useRegistryBrowseStatuses } from "@/lib/walletConnect/useAdditionalConnectors"
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader"

/** Grace period for descriptors that advertised a persisted session to restore it. */
const SESSION_RESTORE_GRACE_MS = 10_000

/** Deadline for the registry (WalletConnect API) browse requests, which are slower than SDK loads. */
const SOURCES_LOADING_TIMEOUT_MS = 8000

/** Deadline for `awaitProvidersSettled`, which runs at click time and must stay snappy. */
const PROVIDERS_SETTLED_TIMEOUT_MS = 3000

// ---------------------------------------------------------------------------
// Registry-wide readiness
// ---------------------------------------------------------------------------

/**
 * Whether the registry as a whole is ready to offer connections. Uses the
 * fail-open predicate, plus a bounded wait for descriptors that advertised a
 * persisted session so a restored wallet isn't missed on first paint.
 */
export function useProvidersConnectReady(): boolean {
    const registryReady = useWalletProvidersReady()
    const providers = useWalletProviderSnapshots()

    const awaitingSessionRestore = providers.some(
        provider => provider.isStub === true && provider.pendingSessionRestore === true,
    )
    const [graceExpired, setGraceExpired] = useState(false)

    useEffect(() => {
        if (!awaitingSessionRestore || graceExpired) return
        const timer = setTimeout(() => setGraceExpired(true), SESSION_RESTORE_GRACE_MS)
        return () => clearTimeout(timer)
    }, [awaitingSessionRestore, graceExpired])

    return registryReady
        && providers.every(isProviderConnectReady)
        && (!awaitingSessionRestore || graceExpired)
}

/**
 * Loading/error state for the connect modal's wallet list.
 *
 * Blocks the list while ecosystem providers hydrate: a partial list invites
 * clicks that commit to the one loaded ecosystem before a wallet's other
 * ecosystems are known (MetaMask → EVM-only connect). Bounded, so a broken SDK
 * chunk can't lock the modal — past the deadline the list renders progressively
 * with the loading tail below. Registry (WalletConnect API) wallets never
 * block: they only append tiles.
 */
export function useConnectorSourcesStatus(featuredProviders: WalletConnectionProvider[]) {
    const { anyLoading: registryLoading, anyError: registryError } = useRegistryBrowseStatuses()
    const providersLoading = featuredProviders.some(provider => !isProviderHydrated(provider))
    const sourcesLoading = providersLoading || registryLoading
    const [sourcesLoadingExpired, setSourcesLoadingExpired] = useState(false)

    useEffect(() => {
        if (!sourcesLoading || sourcesLoadingExpired) return
        const timer = setTimeout(() => setSourcesLoadingExpired(true), SOURCES_LOADING_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [sourcesLoading, sourcesLoadingExpired])

    const [providersLoadingExpired, setProvidersLoadingExpired] = useState(false)

    useEffect(() => {
        if (!providersLoading || providersLoadingExpired) return
        const timer = setTimeout(() => setProvidersLoadingExpired(true), PROVIDER_HYDRATION_TIMEOUT_MS)
        return () => clearTimeout(timer)
    }, [providersLoading, providersLoadingExpired])

    const retryRegistry = useCallback(() => {
        setSourcesLoadingExpired(false)
        ensureRegistryBrowseLoaded()
    }, [])

    return {
        blockListWhileLoading: providersLoading && !providersLoadingExpired,
        registryError,
        retryRegistry,
        showSourcesLoadingTail: sourcesLoading && !sourcesLoadingExpired,
    }
}

/**
 * Click-time readiness: hydrate what a connector tile needs and wait for the
 * live provider before connecting. Every wait is bounded so a broken SDK or
 * request can't hang a connection attempt indefinitely.
 */
export function useWalletProviderReadiness(featuredProviders: WalletConnectionProvider[]) {
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

        return resolveChainConnectors(connectorPool, providerStates, isMobile())
            .get(connectorKey(connector.name))
            ?? []
    }, [registry])

    const isRegistrySettled = useCallback(() => (
        getInstantiatedAdditionalConnectorsStores().every(store => {
            const status = store.getSnapshot().browseMetadata.status
            return status === "ready" || status === "error"
        })
    ), [])

    const areSourcesStillLoading = useCallback(() => (
        registry.getEntries().some(entry => !isProviderHydrated(entry.store.getState()))
        || !isRegistrySettled()
    ), [isRegistrySettled, registry])

    const awaitProvidersSettled = useCallback(async (timeoutMs = PROVIDERS_SETTLED_TIMEOUT_MS) => {
        await loadAll()
        ensureRegistryBrowseLoaded()

        const settled = () => (
            registry.getEntries().every(entry => isProviderHydrated(entry.store.getState()))
            && isRegistrySettled()
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
        timeoutMs = PROVIDER_HYDRATION_TIMEOUT_MS
    ): Promise<WalletConnectionProvider | undefined> => {
        void loadById(providerId)

        const getLiveProvider = () => {
            const provider = registry.getEntries()
                .find(entry => entry.id === providerId)
                ?.store.getState()
            return isProviderHydrated(provider) ? provider : undefined
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
