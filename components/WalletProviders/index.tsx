import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "../../Models/Theme"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { ImtblPassportProvider } from "./ImtblPassportProvider";
import TronProvider from "./TronProvider";
import { StarknetWalletProvider } from "../../context/starknetWalletContext";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <SolanaProvider>
                <TronProvider>
                    <StarknetProvider>
                        <StarknetWalletProvider>
                            <Wagmi>
                                <ImtblPassportProvider>
                                    {children}
                                </ImtblPassportProvider>
                            </Wagmi>
                        </StarknetWalletProvider>
                    </StarknetProvider>
                </TronProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders