"use client";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";
import { WalletProvidersRegistryProvider, useWalletProvidersRegistry, useWalletDescriptorLoader } from "@layerswap/wallet-core";
import { isMobile } from "@layerswap/utils";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import AppSettings from "@/lib/AppSettings";
import { filterSourceNetworks } from "@/helpers/filterSourceNetworks";
import type { WalletProvider, WalletWrapper } from "@/types"
import type { WalletProviderDescriptor } from "@layerswap/wallet-core/types"

export { useWalletProvidersReady } from "@layerswap/wallet-core"

const ConnectorsList = lazy(() => import("@/components/Wallet/WalletModal/ConnectorsList"));

// Shown while the connectors chunk loads on first modal open, so a slow chunk
// fetch surfaces a spinner instead of falling through to the error boundary.
const ConnectorsListFallback: React.FC = () => (
    <div className="flex h-full w-full items-center justify-center py-10">
        <div className="loader text-[3px]!" />
    </div>
);

type ProviderEntry = WalletProvider | WalletWrapper | WalletProviderDescriptor
type WalletProvidersRegistry = ReturnType<typeof useWalletProvidersRegistry>

const waitForProvidersSettled = async (loadAll: () => Promise<void>, registry: WalletProvidersRegistry) => {
    await loadAll()
    const settled = () => registry.getEntries().every(entry => {
        const provider = entry.store.getState()
        return !provider.isStub && provider.ready
    })
    if (settled()) return

    await new Promise<void>(resolve => {
        let unsubscribe = () => { }
        const finish = () => { clearTimeout(timer); unsubscribe(); resolve() }
        const timer = setTimeout(finish, 1200)
        unsubscribe = registry.subscribe(() => { if (settled()) finish() })
    })
}

export const WalletProvidersProvider: React.FC<React.PropsWithChildren & { walletProviders: ProviderEntry[] }> = ({ children, walletProviders }) => {
    const settings = useSettingsState();
    const { networks } = settings;
    return (
        <WalletProvidersRegistryProvider networks={networks} walletProviders={walletProviders}>
            {children}
            <ConnectModalHost settings={settings} />
        </WalletProvidersRegistryProvider>
    );
};

const ConnectModalHost: React.FC<{ settings: ReturnType<typeof useSettingsState> }> = ({ settings }) => {
    const { networks } = settings;
    const isMobilePlatform = isMobile();
    const walletProvidersRegistry = useWalletProvidersRegistry();
    const { goBack, onFinish, open, setOpen, presentation, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()
    const { loadAll } = useWalletDescriptorLoader()
    const [isConnectorsListReady, setIsConnectorsListReady] = useState(false)

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
        let active = true
        if (!open) {
            setIsConnectorsListReady(false)
            return () => { active = false }
        }
        setIsConnectorsListReady(false)
        void waitForProvidersSettled(loadAll, walletProvidersRegistry)
            .then(() => { if (active) setIsConnectorsListReady(true) })
        return () => { active = false }
    }, [open, loadAll])

    return (
        <VaulDrawer
            show={open && presentation === 'modal'}
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
                            {isConnectorsListReady ? (
                                <Suspense fallback={<ConnectorsListFallback />}>
                                    <ConnectorsList onFinish={onFinish} />
                                </Suspense>
                            ) : <ConnectorsListFallback />}
                        </div>
                    </div>
                ) : null}
            </VaulDrawer.Snap>
        </VaulDrawer>
    );
};
