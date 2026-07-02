"use client";
import React, { createContext, lazy, useContext, useMemo } from "react";
import { WalletConnectionProvider, WalletProvider } from "@/types";
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
    const { goBack, onFinish, open, setOpen, presentation, selectedConnector, selectedMultiChainConnector, dismissible, topContent, fullHeight, hideHeader } = useConnectModal()

    const allProviders = walletProviders.map(provider => provider.walletConnectionProvider ? provider.walletConnectionProvider({ networks }) : undefined).filter(provider => provider !== undefined) as WalletConnectionProvider[];

    const providers = useMemo(() => {
        const filteredProviders = allProviders.filter(provider => (isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop')) &&
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
        AppSettings.AvailableSourceNetworkTypes = filterSourceNetworks(settings, filteredProviders)
        return filteredProviders
    }, [networks, isMobilePlatform, allProviders]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
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
