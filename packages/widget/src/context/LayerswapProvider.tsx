'use client'
import { FC, useEffect, useState } from "react"
import ThemeWrapper from "../components/themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import { AuthProvider } from "./authContext";
import { SettingsProvider } from "./settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import ErrorFallback from "../components/ErrorFallback";
import QueryProvider from "./query";
import { THEME_COLORS, ThemeData } from "../Models/Theme";
import { TooltipProvider } from "../components/shadcn/tooltip";
import { AsyncModalProvider } from "./asyncModal";
import WalletsProviders from "../components/Wallet/WalletProviders";
import { IntercomProvider } from 'react-use-intercom';
import AppSettings from "../lib/AppSettings";
import { getSettings } from "../helpers/getSettings";
import { WidgetLoading } from "../components/WidgetLoading";
import LayerSwapApiClient from "../lib/layerSwapApiClient";
import ColorSchema from "../components/ColorSchema";

export type LayerswapContextProps = {
    children?: JSX.Element | JSX.Element[];
    settings?: LayerSwapSettings;
    apiKey: string;
    themeData?: ThemeData | null
    integrator: string
    version?: 'mainnet' | 'testnet'
    walletConnect?: {
        projectId?: string
        name?: string
        description?: string
        url?: string
        icons?: string[]
    }
}

const INTERCOM_APP_ID = 'h5zisg78'
const LayerswapProviderComponent: FC<LayerswapContextProps> = ({ children, settings: _settings, themeData, apiKey, integrator, version, walletConnect }) => {
    const [fetchedSettings, setFetchedSettings] = useState<LayerSwapSettings | null>(null)

    AppSettings.ApiVersion = version
    AppSettings.Integrator = integrator
    AppSettings.ThemeData = { ...THEME_COLORS['default'], ...themeData }
    LayerSwapApiClient.apiKey = apiKey

    useEffect(() => {
        if (!_settings) {
            (async () => {
                const fetchedSettings = await getSettings()
                if (!fetchedSettings) throw new Error('Failed to fetch settings')
                setFetchedSettings(fetchedSettings)
            })()
        }
    }, [])

    const settings = _settings || fetchedSettings
    if (!settings) return <WidgetLoading />

    let appSettings = new LayerSwapAppSettings(settings)

    themeData = { ...THEME_COLORS['default'], ...themeData }

    return (
        <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
            <QueryProvider query={{}}>
                <SettingsProvider data={appSettings}>
                    <AuthProvider>
                        <TooltipProvider delayDuration={500}>
                            <ErrorBoundary FallbackComponent={ErrorFallback} >
                                <ThemeWrapper>
                                    <WalletsProviders themeData={themeData}>
                                        <AsyncModalProvider>
                                            {children}
                                        </AsyncModalProvider>
                                    </WalletsProviders>
                                </ThemeWrapper>
                            </ErrorBoundary>
                        </TooltipProvider>
                    </AuthProvider>
                </SettingsProvider >
            </QueryProvider >
        </IntercomProvider>
    )
}

export const LayerswapProvider: typeof LayerswapProviderComponent = (props) => {
    return (
        <>
            <ColorSchema themeData={props.themeData} />
            <div
                style={{ backgroundColor: 'transparent' }}
                className="layerswap-styles">
                <LayerswapProviderComponent  {...props}>
                    {props.children}
                </LayerswapProviderComponent>
            </div>
        </>

    )
}