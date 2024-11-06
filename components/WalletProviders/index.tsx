import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "../../Models/Theme"
import dynamic from "next/dynamic"
import Wagmi from "./Wagmi";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <Wagmi>
                <SolanaProvider>
                    {children}
                </SolanaProvider>
            </Wagmi>
        </TonConnectProvider>
    )
}

export default WalletsProviders