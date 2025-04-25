import { FC, useEffect, useMemo } from "react"
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
    featuredNetwork?: typeof AppSettings.FeaturedNetwork,
} & AppPageProps

export const LayerswapWidget: FC<LayerswapWidgetProps> = ({ apiKey, settings, themeData, version = 'mainnet', walletConnect, integrator, formValues, featuredNetwork }) => {

    AppSettings.ApiVersion = version
    AppSettings.Integrator = integrator
    AppSettings.FeaturedNetwork = featuredNetwork

    const overriddenFormValues = useMemo(() => {
        const updatedFormValues = { ...formValues };
        if (featuredNetwork) {
            if (featuredNetwork.initialDirection === 'from') {
                const from = settings?.sourceRoutes?.find(network => network.name === featuredNetwork.network);
                updatedFormValues.from = from;
            } else if (featuredNetwork.initialDirection === 'to') {
                const to = settings?.destinationRoutes?.find(network => network.name === featuredNetwork.network);
                updatedFormValues.to = to;
            }
            return updatedFormValues;
        }
        console.log(updatedFormValues, featuredNetwork)
        return updatedFormValues;
    }, [formValues, featuredNetwork]);

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
            formValues={overriddenFormValues}
        />
    )
}