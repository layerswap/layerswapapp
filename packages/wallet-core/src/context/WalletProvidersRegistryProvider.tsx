"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { NetworkWithTokens } from "@layerswap/utils";
import {
    WalletConnectionProvider,
    WalletConnectionStore,
    WalletProviderDescriptor,
    isWalletProviderDescriptor,
} from "@/types/wallet";
import type { WalletProvider, WalletWrapper } from "@/types/provider";
import { createWalletProvidersRegistry, type WalletProvidersRegistry } from "@/lib/walletConnect/walletProvidersRegistry";
import { createDescriptorStubStore } from "@/lib/walletConnect/descriptorStubStore";

type RegistryEntry = { id: string; store: StoreApi<WalletConnectionProvider> }

type ProviderEntry = WalletProvider | WalletWrapper | WalletProviderDescriptor

const WalletProvidersContext = createContext<WalletProvidersRegistry | null>(null)
const WalletProvidersReadyContext = createContext(false)

export function useWalletProvidersRegistry(): WalletProvidersRegistry {
    const registry = useContext(WalletProvidersContext)
    if (!registry) throw new Error('useWalletProvidersRegistry must be used within WalletProvidersRegistryProvider')
    return registry
}

export function useWalletProvidersReady(): boolean {
    return useContext(WalletProvidersReadyContext)
}

export const WalletProvidersRegistryProvider: React.FC<React.PropsWithChildren & { networks: NetworkWithTokens[], walletProviders: ProviderEntry[], }> = ({ children, networks, walletProviders }) => {
    const walletProvidersRegistry = useMemo(() => createWalletProvidersRegistry(), [])
    const [isInitialized, setIsInitialized] = useState(false)

    // Per-id caches: keep real connections alive across re-renders so that
    // a descriptor finishing its load doesn't tear down peer providers.
    const connectionsRef = useRef<Map<string, WalletConnectionStore>>(new Map())
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
            if (!conn && (p as WalletProvider).createConnection) {
                conn = (p as WalletProvider).createConnection({ networks, walletProvidersRegistry })
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
        connectionsRef.current.forEach(c => c.updateProps?.({ networks, walletProvidersRegistry }))
    }, [networks, walletProvidersRegistry])

    return (
        <WalletProvidersContext.Provider value={walletProvidersRegistry}>
            <WalletProvidersReadyContext.Provider value={isInitialized}>
                {children}
            </WalletProvidersReadyContext.Provider>
        </WalletProvidersContext.Provider>
    )
}
