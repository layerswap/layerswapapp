'use client'
import { FC, ReactNode } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "@/Models/Theme"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { ImtblPassportProvider } from "./ImtblPassportProvider";
import TronProvider from "./TronProvider";
import { WalletProvidersProvider } from "@/context/walletProviders";
import { WalletModalProvider } from "../WalletModal";
import FuelProviderWrapper from "./FuelProvider";
import { EvmConnectorsProvider } from "@/context/evmConnectorsContext";
import { BitcoinProvider } from "./BitcoinProvider";
import { ActiveParadexAccountProvider } from "./ActiveParadexAccount";
import AppSettings from "@/lib/AppSettings";

const WalletsProviders: FC<{ children: ReactNode, basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <SolanaProvider>
                <TronProvider>
                    <StarknetProvider>
                        <EvmConnectorsProvider>
                            <Wagmi>
                                <ActiveParadexAccountProvider>
                                    <FuelProviderWrapper>
                                        <ImtblPassportProvider client_id={AppSettings.ImtblPassportConfig?.clientId} publishable_key={AppSettings.ImtblPassportConfig?.publishableKey} redirect_uri={AppSettings.ImtblPassportConfig?.redirectUri} base_path={AppSettings.ImtblPassportConfig?.appBasePath}>
                                            <BitcoinProvider>
                                                <WalletModalProvider>
                                                    <WalletProvidersProvider>
                                                        {children}
                                                    </WalletProvidersProvider>
                                                </WalletModalProvider>
                                            </BitcoinProvider>
                                        </ImtblPassportProvider>
                                    </FuelProviderWrapper>
                                </ActiveParadexAccountProvider>
                            </Wagmi>
                        </EvmConnectorsProvider>
                    </StarknetProvider>
                </TronProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders