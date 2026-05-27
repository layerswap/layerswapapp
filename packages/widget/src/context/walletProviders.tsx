"use client";
import React, { lazy, useEffect, useMemo } from "react";
import { WalletConnectionStore, WalletProvider } from "@/types";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import AppSettings from "@/lib/AppSettings";
import { filterSourceNetworks } from "@/helpers/filterSourceNetworks";
import { walletProvidersRegistry } from "@/lib/walletConnect/walletProvidersRegistry";
import clsx from "clsx";

const ConnectorsList = lazy(() => import("@/components/Wallet/WalletModal/ConnectorsList"));

type Connection = { id: string; conn: WalletConnectionStore }

export const WalletProvidersProvider: React.FC<React.PropsWithChildren & { walletProviders: WalletProvider[] }> = ({ children, walletProviders }) => {
    const { networks } = useSettingsState();
    const settings = useSettingsState();
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()

    // Build per-provider connections once per provider list. Each connection
    // owns its own zustand store; the widget publishes them to a vanilla
    // registry so React consumers (useWallet) and non-React peers (Paradex)
    // can subscribe directly.
    const connections = useMemo<Connection[]>(
        () => walletProviders
            .map(p => ({ id: p.id, conn: p.createConnection?.({ networks }) }))
            .filter((c): c is Connection => !!c.conn),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletProviders],
    )

    useEffect(() => {
        connections.forEach(c => c.conn.updateProps?.({ networks }))
    }, [connections, networks])

    useEffect(() => {
        walletProvidersRegistry.setEntries(connections.map(c => ({ id: c.id, store: c.conn.store })))
        return () => {
            connections.forEach(c => c.conn.destroy?.())
            walletProvidersRegistry.setEntries([])
        }
    }, [connections])

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
    }, [settings, networks, isMobilePlatform])

    return (
        <>
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
        </>
    );
};
