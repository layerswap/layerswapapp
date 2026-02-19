import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider } from "../Models/WalletProvider";
import { useSettingsState } from "../context/settings";
import VaulDrawer from "../components/modal/vaulModal";
import IconButton from "../components/buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import ConnectorsList from "../components/WalletModal/ConnectorsList";
import { useConnectModal } from "../components/WalletModal";
import useEVM from "../lib/wallets/evm/useEVM";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useImtblX from "../lib/wallets/imtblX/useImtblX";
import useTON from "../lib/wallets/ton/useTON";
import useFuel from "../lib/wallets/fuel/useFuel";
import useTron from "../lib/wallets/tron/useTron";
import useParadex from "../lib/wallets/paradex/useParadex";
import useSVM from "../lib/wallets/solana/useSVM";
import useBitcoin from "../lib/wallets/bitcoin/useBitcoin";
import { isMobile } from "@/lib/wallets/connectors/utils/isMobile";
import useWindowDimensions from "@/hooks/useWindowDimensions";

const WalletProvidersContext = createContext<WalletProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const isMobilePlatform = isMobile();
    const { isMobile: isMobileSize } = useWindowDimensions()
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector } = useConnectModal()

    const bitcoin = useBitcoin()
    const evm = useEVM();
    const starknet = useStarknet();
    const imtblX = useImtblX();
    const svm = useSVM();
    const ton = useTON();
    const fuel = useFuel();
    const tron = useTron();
    const paradex = useParadex();

    const providers = useMemo(() => {
        const allProviders: WalletProvider[] = [
            evm, starknet, svm, bitcoin, ton, fuel, tron, paradex, imtblX
        ];
        const filteredProviders = allProviders.filter(provider => isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop'));

        return filteredProviders.filter(provider =>
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
    }, [networks, bitcoin, evm, starknet, svm, ton, fuel, tron, paradex, imtblX, isMobilePlatform]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                zLevel={2}
                header={
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
                }>
                <VaulDrawer.Snap openFullHeight={!isMobileSize} id='item-1' className="pb-4 sm:pb-0! sm:h-full">
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);
