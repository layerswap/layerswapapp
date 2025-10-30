"use client";
import React, { createContext, useContext, useMemo } from "react";
import { WalletConnectionProvider, WalletProvider, WalletProviderModule } from "@/types";
import { useSettingsState } from "./settings";
import VaulDrawer from "@/components/Modal/vaulModal";
import IconButton from "@/components/Buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import ConnectorsList from "@/components/Wallet/WalletModal/ConnectorsList";
import { useConnectModal } from "@/components/Wallet/WalletModal";
import { isMobile } from "@/lib/wallets/utils/isMobile";

type WalletProvidersContextValue = {
    providers: WalletConnectionProvider[];
    providerModules: WalletProviderModule[];
}
const WalletProvidersContext = createContext<WalletProvidersContextValue>({
    providers: [],
    providerModules: [],
});

export const WalletProvidersProvider: React.FC<React.PropsWithChildren & { walletProviders: WalletProvider[], walletProviderModules: WalletProviderModule[] }> = ({ children, walletProviders, walletProviderModules }) => {
    const { networks } = useSettingsState();
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector } = useConnectModal()

    const allProviders = walletProviders.map(provider => provider.walletConnectionProvider ? provider.walletConnectionProvider({ networks }) : undefined).filter(provider => provider !== undefined) as WalletConnectionProvider[];

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

    const providerModules = useMemo(() => {
        const filteredModules = walletProviderModules.filter(module => networks.some(net => module.multiStepHandler?.supportedNetworks.includes(net.name)));
        return filteredModules
    }, [networks, walletProviderModules]);

    return (
        <WalletProvidersContext.Provider value={{ providers, providerModules }}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            (selectedConnector || selectedMultiChainConnector) &&
                            <div className="sm:-ml-2 -ml-0">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>
                    </div>
                }>
                <VaulDrawer.Snap id='item-1'>
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);
