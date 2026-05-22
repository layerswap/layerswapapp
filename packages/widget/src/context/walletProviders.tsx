"use client";
import React, { createContext, lazy, useContext, useEffect, useMemo, useState } from "react";
import { WalletConnectionProvider, WalletConnectionStore, WalletProvider } from "@/types";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import AppSettings from "@/lib/AppSettings";
import { filterSourceNetworks } from "@/helpers/filterSourceNetworks";
import clsx from "clsx";

const ConnectorsList = lazy(() => import("@/components/Wallet/WalletModal/ConnectorsList"));

const WalletProvidersContext = createContext<WalletConnectionProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren & { walletProviders: WalletProvider[] }> = ({ children, walletProviders }) => {
    const { networks } = useSettingsState();
    const settings = useSettingsState();
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()

    // Build stores once per provider list. Stores own their lifecycle —
    // creating a fresh one per render would leak subscriptions.
    const stores = useMemo<WalletConnectionStore[]>(
        () => walletProviders
            .map(p => p.createConnection?.({ networks }))
            .filter((s): s is WalletConnectionStore => !!s),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletProviders],
    )

    useEffect(() => {
        stores.forEach(s => s.updateProps?.({ networks }))
    }, [stores, networks])

    const [snapshots, setSnapshots] = useState<WalletConnectionProvider[]>(() => stores.map(s => s.getSnapshot()))
    useEffect(() => {
        const recompute = () => setSnapshots(stores.map(s => s.getSnapshot()))
        recompute()
        const unsubs = stores.map(s => s.subscribe(recompute))
        // The subscribe cleanup is enough — stores ref-count their internal
        // subscriptions so they re-attach on next mount. We deliberately do
        // NOT call store.destroy() here; that would be a hard tear-down and
        // strict mode's double-mount would briefly leak listeners.
        return () => unsubs.forEach(u => u())
    }, [stores])

    const providers = useMemo(() => {
        const filteredProviders = snapshots.filter(provider => (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
        AppSettings.AvailableSourceNetworkTypes = filterSourceNetworks(settings, filteredProviders)
        return filteredProviders
    }, [snapshots, networks, isMobilePlatform]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                dismissible={dismissible}
                header={hideHeader ? undefined : (
                    <div className="flex items-center gap-1">
                        {
                            (selectedConnector || selectedMultiChainConnector) &&
                            <div className="sm:-ml-2 ml-0">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>
                    </div>
                )}>
                <VaulDrawer.Snap openFullHeight id='item-1' className={clsx("h-full max-h-[83svh] sm:max-h-full", fullHeight && "openpicker", hideHeader && "pt-4")}>
                    {open ? (
                        <div className="flex flex-col gap-3 h-full">
                            {!selectedConnector && !selectedMultiChainConnector ? topContent : null}
                            <div className="flex-1 min-h-0">
                                <ConnectorsList onFinish={onFinish} />
                            </div>
                        </div>
                    ) : null}
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);
