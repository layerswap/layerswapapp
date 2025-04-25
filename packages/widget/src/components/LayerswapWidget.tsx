import { FC } from "react"
import { Swap } from "./Pages/SwapPages/Form"
import { AppPageProps } from "./AppWrapper"
import AppSettings from "../lib/AppSettings"

type LayerswapWidgetProps = {
    integrator: string
    version?: 'mainnet' | 'testnet'
    walletConnect?: {
        projectId?: string
        name?: string
        description?: string
        url?: string
        icons?: string[]
    }
} & AppPageProps

export const LayerswapWidget: FC<LayerswapWidgetProps> = ({ apiKey, settings, themeData, version, walletConnect, integrator }) => {

    AppSettings.ApiVersion = version
    AppSettings.Integrator = integrator
    
    if (apiKey)
        AppSettings.apikey = apiKey

    return (
        <Swap
            apiKey={apiKey}
            settings={settings}
            themeData={themeData}
        />
    )
}