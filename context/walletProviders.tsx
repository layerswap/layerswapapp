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

const WalletProvidersContext = createContext<WalletProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const { goBack, onFinish, open, setOpen, selectedConnector } = useConnectModal()

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
            evm, starknet, svm, ton, fuel, tron, paradex, imtblX
        ];

        return allProviders.filter(provider =>
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
    }, [networks, evm, starknet, svm, ton, fuel, tron, paradex, imtblX]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            selectedConnector &&
                            <div className='-ml-2'>
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>Connect wallet</p>
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
