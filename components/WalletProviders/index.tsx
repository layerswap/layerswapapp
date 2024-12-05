import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "../../Models/Theme"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import dynamic from "next/dynamic";

const TronProvider = dynamic(() => import("./TronProvider").then((comp) => comp.default), {
    loading: () => null
})

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <SolanaProvider>
                <TronProvider>
                    <StarknetProvider>
                        <Wagmi>
                            {
                                TronProvider ?
                                    <TronProvider>
                                        {children}
                                    </TronProvider>
                                    :
                                    children
                            }
                        </Wagmi>
                    </StarknetProvider>
                </TronProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders