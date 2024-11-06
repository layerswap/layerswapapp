import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "../../Models/Theme"
import dynamic from "next/dynamic"
import Wagmi from "./Wagmi";

const FuelProviderWrapper = dynamic(() => import("./FuelProvider").then((comp) => comp.default), {
    loading: () => null
})

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <Wagmi>
                <SolanaProvider>
                    {
                        FuelProviderWrapper ?
                            <FuelProviderWrapper>
                                {children}
                            </FuelProviderWrapper> :
                            <>
                                {children}
                            </>
                    }
                </SolanaProvider>
            </Wagmi>
        </TonConnectProvider>
    )
}

export default WalletsProviders