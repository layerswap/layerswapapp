import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import RainbowKit from "./RainbowKit"
import { ThemeData } from "../../Models/Theme"
import dynamic from "next/dynamic"
import SolanaProvider from "./SolanaProvider"

const FuelProviderWrapper = dynamic(() => import("./FuelProvider").then((comp) => comp.default), {
    loading: () => null
})

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <RainbowKit>
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
            </RainbowKit>
        </TonConnectProvider>
    )
}

export default WalletsProviders