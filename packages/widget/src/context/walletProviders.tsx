"use client";
import React, { createContext, lazy, useContext, useEffect, useMemo } from "react";
import { WalletConnectionProvider } from "@/types";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import AppSettings from "@/lib/AppSettings";
import { filterSourceNetworks } from "@/helpers/filterSourceNetworks";
import { useWalletConnectionProviders } from "./walletConnectionRegistry";
import clsx from "clsx";

const ConnectorsList = lazy(() => import("@/components/Wallet/WalletModal/ConnectorsList"));

const WalletProvidersContext = createContext<WalletConnectionProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const settings = useSettingsState();
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()

    // Connection providers come from the wallet-connection-registry, which
    // each chain shell's registrar writes into from an effect. Registry
    // ordering is by `order` field assigned in defineWalletProvider, so
    // resolution priority (first match wins in `useWallet`) is stable
    // regardless of which lazy chunk happens to land first.
    const allProviders = useWalletConnectionProviders()

    const providers = useMemo(() => {
        const filteredProviders = allProviders.filter(provider => (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
        return filteredProviders
    }, [networks, isMobilePlatform, allProviders]);

    // AppSettings is a module-level singleton; writing to it during render
    // would cause non-deterministic SSR output, so we update it after
    // commit. Consumers that read it (e.g. NetworkSelect filtering)
    // already tolerate a one-render delay because they re-derive from
    // their own state after mount.
    useEffect(() => {
        AppSettings.AvailableSourceNetworkTypes = filterSourceNetworks(settings, providers)
    }, [settings, providers])

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
