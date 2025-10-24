'use client'
import { FC, ReactNode, useEffect, useState } from "react"
import ThemeWrapper from "../components/themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import { SettingsProvider } from "./settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import ErrorFallback from "../components/ErrorFallback";
import { THEME_COLORS, ThemeData } from "../Models/Theme";
import { AsyncModalProvider } from "./asyncModal";
import { IntercomProvider } from 'react-use-intercom';
import AppSettings from "../lib/AppSettings";
import { getSettings } from "../helpers/getSettings";
import LayerSwapApiClient from "@/lib/apiClients/layerSwapApiClient";
import ColorSchema from "@/components/ColorSchema";
import { WidgetLoading } from "@/components/WidgetLoading";
import WalletsProviders from "@/components/Wallet/WalletProviders";
import { CallbackProvider, CallbacksContextType } from "./callbackProvider";
import { InitialSettings } from "../Models/InitialSettings";
import { BalanceAccountsProvider } from "./balanceAccounts";
import { LogEvent, WalletProvider } from "@/types";
import { ResolverProviders } from "./resolverContext";
import { LogProvider } from "./LogProvider";

export type LayerswapContextProps = {
    children?: ReactNode;
    settings?: LayerSwapSettings;
    apiKey?: string;
    themeData?: ThemeData | null
    integrator: string
    version?: 'mainnet' | 'testnet'
    callbacks?: CallbacksContextType
    initialValues?: InitialSettings
    walletConnect?: typeof AppSettings.WalletConnectConfig
    imtblPassport?: typeof AppSettings.ImtblPassportConfig
    walletProviders?: WalletProvider[]
    onLogEvent?: (event: LogEvent) => void;
}

const INTERCOM_APP_ID = 'h5zisg78'
const LayerswapProviderComponent: FC<LayerswapContextProps> = ({ children, settings: _settings, themeData, apiKey, integrator, version, callbacks, initialValues, walletConnect, imtblPassport, walletProviders = [], onLogEvent }) => {
    const [fetchedSettings, setFetchedSettings] = useState<LayerSwapSettings | null>(null)

    AppSettings.ApiVersion = version
    AppSettings.Integrator = integrator
    AppSettings.ThemeData = { ...THEME_COLORS['default'], ...themeData }
    AppSettings.ImtblPassportConfig = imtblPassport
    if (apiKey) LayerSwapApiClient.apiKey = apiKey

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
            <SettingsProvider initialLayerswapData={appSettings} initialSettings={initialValues}>
                <CallbackProvider callbacks={callbacks}>
                    <LogProvider onLogEvent={onLogEvent}>
                        <ErrorBoundary FallbackComponent={ErrorFallback} >
                            <ThemeWrapper>
                                <WalletsProviders
                                    appName={integrator}
                                    basePath="/"
                                    themeData={themeData}
                                    walletProviders={walletProviders}
                                >
                                    <ResolverProviders walletProviders={walletProviders}>
                                        <BalanceAccountsProvider>
                                            <AsyncModalProvider>
                                                {children}
                                            </AsyncModalProvider>
                                        </BalanceAccountsProvider>
                                    </ResolverProviders>
                                </WalletsProviders>
                            </ThemeWrapper>
                        </ErrorBoundary>
                    </LogProvider>
                </CallbackProvider>
            </SettingsProvider >
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
            </div >
        </>

    )
}