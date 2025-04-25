import { FC, useEffect } from "react"
import { Swap } from "./Pages/SwapPages/Form"
import { AppPageProps } from "./AppWrapper"
import AppSettings from "../lib/AppSettings"
import { getSettings } from "../helpers/getSettings"
import { SwapFormValues } from "./Pages/SwapPages/Form/SwapFormValues"

type LayerswapWidgetProps = {
    integrator: string
    version?: 'mainnet' | 'testnet'
    walletConnect?: {
        projectId?: string
        name?: string
        description?: string
        url?: string
        icons?: string[]
    },
    formValues?: SwapFormValues
} & AppPageProps

export const LayerswapWidget: FC<LayerswapWidgetProps> = ({ apiKey, settings, themeData, version, walletConnect, integrator, formValues }) => {

    AppSettings.ApiVersion = version
    AppSettings.Integrator = integrator
    
    if (apiKey)
        AppSettings.apikey = apiKey

    useEffect(() => {
        if (!settings) {
            (async () => {
                const fetchedSettings = await getSettings()
                if (!fetchedSettings) throw new Error('Failed to fetch settings')
                settings = fetchedSettings
            })()
        }
    }, [])

    if (!settings) {
        return <div>Loading...</div>
    }

    return (
        <Swap
            apiKey={apiKey}
            settings={settings}
            themeData={themeData}
            formValues={formValues}
        />
    )
}