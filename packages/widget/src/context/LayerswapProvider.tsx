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
import { WalletProvider } from "@/types";
import { ResolverProviders } from "./resolverContext";
import { ErrorProvider } from "./ErrorProvider";

export type LayerswapWidgetConfig = {
    apiKey?: string;
    version?: 'mainnet' | 'testnet'
    settings?: LayerSwapSettings;
    theme?: ThemeData | null,
    initialValues?: InitialSettings,
    walletConnect?: typeof AppSettings.WalletConnectConfig
    imtblPassport?: typeof AppSettings.ImtblPassportConfig
    tonConfigs?: typeof AppSettings.TonClientConfig
}

export type LayerswapContextProps = {
    children?: ReactNode;
    callbacks?: CallbacksContextType
    config?: LayerswapWidgetConfig
    walletProviders?: WalletProvider[]
}

const INTERCOM_APP_ID = 'h5zisg78'
const LayerswapProviderComponent: FC<LayerswapContextProps> = ({ children, callbacks, config, walletProviders = [] }) => {
    let { apiKey, version, settings: _settings, theme: themeData, imtblPassport, initialValues } = config || {}
    const [fetchedSettings, setFetchedSettings] = useState<LayerSwapSettings | null>(null)
    themeData = { ...THEME_COLORS['default'], ...config?.theme }

    AppSettings.ApiVersion = version || AppSettings.ApiVersion
    AppSettings.ImtblPassportConfig = imtblPassport
    AppSettings.TonClientConfig = config?.tonConfigs || AppSettings.TonClientConfig
    AppSettings.WalletConnectConfig = config?.walletConnect || AppSettings.WalletConnectConfig
    AppSettings.ThemeData = themeData
    if (apiKey) LayerSwapApiClient.apiKey = apiKey

    useEffect(() => {
        if (!_settings) {
            (async () => {
                const fetchedSettings = await getSettings(apiKey || AppSettings.LayerswapApiKeys[version || AppSettings.ApiVersion])
                if (!fetchedSettings) throw new Error('Failed to fetch settings')
                setFetchedSettings(fetchedSettings)
            })()
        }
    }, [])

    const settings = _settings || fetchedSettings
    if (!settings) return <WidgetLoading />

    let appSettings = new LayerSwapAppSettings(settings)

    return (
        <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
            <SettingsProvider initialLayerswapData={appSettings} initialSettings={config?.initialValues}>
                <CallbackProvider callbacks={callbacks}>
                    <ErrorProvider>
                        <ErrorBoundary FallbackComponent={ErrorFallback} >
                            <ThemeWrapper>
                                <WalletsProviders
                                    appName={initialValues?.appName}
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
                    </ErrorProvider>
                </CallbackProvider>
            </SettingsProvider >
        </IntercomProvider>
    )
}

export const LayerswapProvider: typeof LayerswapProviderComponent = (props) => {
    return (
        <>
            <ColorSchema themeData={props.config?.theme} />
            <div
                style={{ backgroundColor: 'transparent', height: '100%' }}
                className="layerswap-styles">
                <LayerswapProviderComponent  {...props}>
                    {props.children}
                </LayerswapProviderComponent>
            </div >
        </>

    )
}