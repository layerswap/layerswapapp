"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FC, type PropsWithChildren, type ReactNode } from "react";
import type { StoreApi } from "zustand/vanilla";
import { WalletConnectionProvider, WalletConnectionStore, WalletProviderDescriptor, isWalletProviderDescriptor, } from "@/types/wallet";
import type { AppNetworkAdapter } from "@/types/network";
import type { WalletProvider, WalletWrapper } from "@/types/provider";
import { createWalletProvidersRegistry, type WalletProvidersRegistry } from "@/lib/walletConnect/walletProvidersRegistry";
import { createDescriptorStubStore } from "@/lib/walletConnect/descriptorStubStore";
import { WalletDescriptorLoaderContext } from "@/lib/walletConnect/walletDescriptorLoader";

type RegistryEntry = { id: string; store: StoreApi<WalletConnectionProvider> }

type ProviderEntry<Network> = WalletProvider<Network> | WalletWrapper | WalletProviderDescriptor<Network>

const WalletProvidersContext = createContext<WalletProvidersRegistry | null>(null)
const WalletProvidersReadyContext = createContext(false)
const HasConfiguredWalletProvidersContext = createContext(false)

export function useWalletProvidersRegistry(): WalletProvidersRegistry {
    const registry = useContext(WalletProvidersContext)
    if (!registry) throw new Error('useWalletProvidersRegistry must be used within WalletProvidersRegistryProvider')
    return registry
}

export function useWalletProvidersReady(): boolean {
    return useContext(WalletProvidersReadyContext)
}

export function useHasConfiguredWalletProviders(): boolean {
    return useContext(HasConfiguredWalletProvidersContext)
}

export function DescriptorHydrationBoundary<Network>({
    walletProviders,
    children,
}: {
    walletProviders: ProviderEntry<Network>[]
    children: (resolved: ProviderEntry<Network>[]) => ReactNode
}) {
    const [loadedById, setLoadedById] = useState<ReadonlyMap<string, WalletProvider<Network> | WalletWrapper>>(new Map())
    // In-flight loads, deduplicated by id, so concurrent triggers don't double-import the SDK.
    const inflightRef = useRef<Map<string, Promise<void>>>(new Map())
    // Read via ref, not deps: otherwise each resolved descriptor changes
    // `loadById`/`loadAll` identity and re-renders every loader consumer.
    const loadedByIdRef = useRef(loadedById)
    loadedByIdRef.current = loadedById

    const resolvedProviders = useMemo(() => walletProviders.map(p => {
        if (!isWalletProviderDescriptor(p)) return p
        return loadedById.get(p.id) ?? p
    }), [walletProviders, loadedById])

    const loadById = useCallback<(id: string) => Promise<void>>(async (id) => {
        if (loadedByIdRef.current.has(id)) return
        const existing = inflightRef.current.get(id)
        if (existing) return existing
        const descriptor = walletProviders.find(p => isWalletProviderDescriptor(p) && p.id === id) as WalletProviderDescriptor<Network> | undefined
        if (!descriptor) return
        const p = descriptor.loadProvider().then(real => {
            setLoadedById(prev => {
                if (prev.has(id)) return prev
                const next = new Map(prev)
                next.set(id, real as WalletProvider<Network> | WalletWrapper)
                return next
            })
        }).catch(error => {
            // Absorbed so fire-and-forget callers never reject; the next
            // trigger retries since `loadedById` stays unset.
            console.error(`[layerswap/ui-kit] Failed to load wallet provider "${id}"`, error)
        }).finally(() => {
            inflightRef.current.delete(id)
        })
        inflightRef.current.set(id, p)
        return p
    }, [walletProviders])

    const loadAll = useCallback(async () => {
        const pending = walletProviders
            .filter((p): p is WalletProviderDescriptor<Network> => isWalletProviderDescriptor(p) && !loadedByIdRef.current.has(p.id))
            .map(p => loadById(p.id))
        await Promise.all(pending)
    }, [walletProviders, loadById])

    // Descriptors with a persisted-session marker (a cheap localStorage sniff
    // that never loads the SDK) hydrate on mount, so restored sessions surface
    // without the user opening the connect modal.
    useEffect(() => {
        walletProviders.forEach(p => {
            if (isWalletProviderDescriptor(p)
                && !loadedByIdRef.current.has(p.id)
                && p.hasPersistedSession?.() === true) {
                void loadById(p.id)
            }
        })
    }, [walletProviders, loadById])

    const loaderValue = useMemo(() => ({ loadById, loadAll }), [loadById, loadAll])

    return (
        <WalletDescriptorLoaderContext.Provider value={loaderValue}>
            {children(resolvedProviders)}
        </WalletDescriptorLoaderContext.Provider>
    )
}

export function WalletProvidersRegistryProvider<Network>({
    children,
    networks,
    networkAdapter,
    walletProviders,
}: PropsWithChildren<{
    networks: Network[]
    networkAdapter: AppNetworkAdapter<Network>
    walletProviders: ProviderEntry<Network>[]
}>) {
    const walletProvidersRegistry = useMemo(() => createWalletProvidersRegistry(), [])
    const [isInitialized, setIsInitialized] = useState(false)
    const hasConfiguredProviders = useMemo(
        () => walletProviders.some(
            provider => isWalletProviderDescriptor(provider)
                || !!(provider as WalletProvider<Network>).createConnection
        ),
        [walletProviders]
    )

    // Per-id caches: keep real connections alive across re-renders so that
    // a descriptor finishing its load doesn't tear down peer providers.
    const connectionsRef = useRef<Map<string, WalletConnectionStore<Network>>>(new Map())
    const stubsRef = useRef<Map<string, StoreApi<WalletConnectionProvider>>>(new Map())

    useEffect(() => {
        const seenIds = new Set<string>()
        const entries: RegistryEntry[] = []

        for (const p of walletProviders) {
            seenIds.add(p.id)
            if (isWalletProviderDescriptor(p)) {
                // Descriptor still pending: serve a static-metadata stub so
                // route filtering and the registry see the provider exists.
                let stub = stubsRef.current.get(p.id)
                if (!stub) {
                    stub = createDescriptorStubStore(p)
                    stubsRef.current.set(p.id, stub)
                }
                entries.push({ id: p.id, store: stub })
                continue
            }
            // Real provider: drop any prior stub for this id, then init
            // a connection if we don't already have one.
            stubsRef.current.delete(p.id)
            let conn = connectionsRef.current.get(p.id)
            if (!conn && (p as WalletProvider<Network>).createConnection) {
                conn = (p as WalletProvider<Network>).createConnection({
                    networks,
                    networkAdapter,
                    walletProvidersRegistry,
                })
                connectionsRef.current.set(p.id, conn)
            }
            if (conn) entries.push({ id: p.id, store: conn.store })
        }

        // Tear down anything that disappeared from the input.
        for (const [id, conn] of connectionsRef.current) {
            if (!seenIds.has(id)) {
                conn.destroy?.()
                connectionsRef.current.delete(id)
            }
        }
        for (const id of Array.from(stubsRef.current.keys())) {
            if (!seenIds.has(id)) stubsRef.current.delete(id)
        }

        walletProvidersRegistry.setEntries(entries)
        setIsInitialized(true)
        // Network changes update committed stores in the effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletProviders, walletProvidersRegistry])

    useEffect(() => () => {
        // On unmount, dispose every still-live connection.
        for (const conn of connectionsRef.current.values()) conn.destroy?.()
        connectionsRef.current.clear()
        stubsRef.current.clear()
        walletProvidersRegistry.setEntries([])
    }, [walletProvidersRegistry])

    useEffect(() => {
        connectionsRef.current.forEach(c => c.updateProps?.({ networks, networkAdapter, walletProvidersRegistry }))
    }, [networks, networkAdapter, walletProvidersRegistry])

    return (
        <WalletProvidersContext.Provider value={walletProvidersRegistry}>
            <WalletProvidersReadyContext.Provider value={isInitialized}>
                <HasConfiguredWalletProvidersContext.Provider value={hasConfiguredProviders}>
                    {children}
                </HasConfiguredWalletProvidersContext.Provider>
            </WalletProvidersReadyContext.Provider>
        </WalletProvidersContext.Provider>
    )
}
