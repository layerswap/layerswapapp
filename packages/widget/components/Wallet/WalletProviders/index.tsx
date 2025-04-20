import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { ImtblPassportProvider } from "./ImtblPassportProvider";
import TronProvider from "./TronProvider";
import { ThemeData } from "../../../Models/Theme";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], themeData: ThemeData, appName: string | undefined }> = ({ children, themeData, appName }) => {
    return (
        <TonConnectProvider themeData={themeData} appName={appName}>
            <SolanaProvider>
                <TronProvider>
                    <StarknetProvider>
                        <Wagmi>
                            <ImtblPassportProvider>
                                {children}
                            </ImtblPassportProvider>
                        </Wagmi>
                    </StarknetProvider>
                </TronProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders