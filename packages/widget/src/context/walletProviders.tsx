"use client";
import React, { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef } from "react";
import type { StoreApi } from "zustand/vanilla";
import { WalletConnectionProvider, WalletConnectionStore, WalletProvider, WalletProviderDescriptor, WalletWrapper, isWalletProviderDescriptor } from "@/types";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import AppSettings from "@/lib/AppSettings";
import { filterSourceNetworks } from "@/helpers/filterSourceNetworks";
import { createWalletProvidersRegistry, type WalletProvidersRegistry } from "@/lib/walletConnect/walletProvidersRegistry";
import { createDescriptorStubStore } from "@/lib/walletConnect/descriptorStubStore";
import { useWalletDescriptorLoader } from "@/lib/walletConnect/walletDescriptorLoader";
import clsx from "clsx";

const ConnectorsList = lazy(() => import("@/components/Wallet/WalletModal/ConnectorsList"));

// Shown while the connectors chunk loads on first modal open, so a slow chunk
// fetch surfaces a spinner instead of falling through to the error boundary.
const ConnectorsListFallback: React.FC = () => (
    <div className="flex h-full w-full items-center justify-center py-10">
        <div className="loader text-[3px]!" />
    </div>
);

type RegistryEntry = { id: string; store: StoreApi<WalletConnectionProvider> }

const WalletProvidersRegistryContext = createContext<WalletProvidersRegistry | null>(null)

export function useWalletProvidersRegistry(): WalletProvidersRegistry {
    const registry = useContext(WalletProvidersRegistryContext)
    if (!registry) throw new Error('useWalletProvidersRegistry must be used within WalletProvidersProvider')
    return registry
}

type ProviderEntry = WalletProvider | WalletWrapper | WalletProviderDescriptor

export const WalletProvidersProvider: React.FC<React.PropsWithChildren & { walletProviders: ProviderEntry[] }> = ({ children, walletProviders }) => {
    const settings = useSettingsState();
    const { networks } = settings;
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()

    const walletProvidersRegistry = useMemo(() => createWalletProvidersRegistry(), [])
    const { loadAll } = useWalletDescriptorLoader()

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

    // `AvailableSourceNetworkTypes` is read by `helpers/routes.ts` to decide
    // which source-network types are reachable. It depends on each provider's
    // current `withdrawalSupportedNetworks` plus the connected wallets, so it
    // must be refreshed whenever any provider's state moves.
    useEffect(() => {
        const recompute = () => {
            const snapshots = walletProvidersRegistry.getEntries().map(e => e.store.getState())
            const filtered = snapshots.filter(provider =>
                (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
                networks.some(net =>
                    provider.autofillSupportedNetworks?.includes(net.name) ||
                    provider.withdrawalSupportedNetworks?.includes(net.name) ||
                    provider.asSourceSupportedNetworks?.includes(net.name)
                )
            )
            AppSettings.AvailableSourceNetworkTypes = filterSourceNetworks(settings, filtered)
        }
        recompute()
        return walletProvidersRegistry.subscribe(recompute)
    }, [settings, networks, isMobilePlatform, walletProvidersRegistry])

    // Phase-1 trigger: hydrate every pending descriptor the first time the
    // connect modal opens. Later phases can add finer-grained triggers
    // (idle prefetch of connected families, swap-page hydration, etc.).
    useEffect(() => {
        if (open) void loadAll()
    }, [open, loadAll])

    return (
        <WalletProvidersRegistryContext.Provider value={walletProvidersRegistry}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                dismissible={dismissible}
                header={
                    <div className="flex items-center gap-1">
                        {
                            (selectedConnector || selectedMultiChainConnector) ?
                                <div className="sm:-ml-2 ml-0">
                                    <IconButton onClick={goBack} icon={
                                        <ChevronLeft className="h-6 w-6" />
                                    }>
                                    </IconButton>
                                </div>
                                : null
                        }
                        {hideHeader ? undefined : <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>}
                    </div>
                }>
                <VaulDrawer.Snap openFullHeight id='item-1' className={clsx("h-full max-h-[83svh] sm:max-h-full", fullHeight && "openpicker")}>
                    {open ? (
                        <div className="flex flex-col gap-3 h-full">
                            {!selectedConnector && !selectedMultiChainConnector ? topContent : null}
                            <div className="flex-1 min-h-0">
                                <Suspense fallback={<ConnectorsListFallback />}>
                                    <ConnectorsList onFinish={onFinish} />
                                </Suspense>
                            </div>
                        </div>
                    ) : null}
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersRegistryContext.Provider>
    );
};
