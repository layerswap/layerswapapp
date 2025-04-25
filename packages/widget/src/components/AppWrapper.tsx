import React, { FC } from "react"
import ThemeWrapper from "./themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import { AuthProvider } from "../context/authContext";
import { SettingsProvider } from "../context/settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import ErrorFallback from "./ErrorFallback";
import QueryProvider from "../context/query";
import { THEME_COLORS, ThemeData } from "../Models/Theme";
import { TooltipProvider } from "./shadcn/tooltip";
import ColorSchema from "./ColorSchema";
import { AsyncModalProvider } from "../context/asyncModal";
import WalletsProviders from "./Wallet/WalletProviders";
import { Maintanance } from "./Pages/Maintanance";
import { IntercomProvider } from 'react-use-intercom';
import '../styles/globals.css'
import '../styles/dialog-transition.css'
import '../styles/manual-trasnfer-svg.css'
import '../styles/vaul.css'

export type AppPageProps = {
    children?: JSX.Element | JSX.Element[];
    settings: LayerSwapSettings;
    apiKey?: string;
    themeData?: ThemeData | null
}
const INTERCOM_APP_ID = 'h5zisg78'
const AppWrapper: FC<AppPageProps> = ({ children, settings, themeData, apiKey }) => {

    if (!settings)
        return <ThemeWrapper>
            <Maintanance />
        </ThemeWrapper>

    let appSettings = new LayerSwapAppSettings(settings)

    themeData = themeData || THEME_COLORS.default

    return (
        <>
            {
                themeData &&
                <ColorSchema themeData={themeData} />
            }
            <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
                <QueryProvider query={{}}>
                    <SettingsProvider data={appSettings}>
                        <AuthProvider>
                            <TooltipProvider delayDuration={500}>
                                <ErrorBoundary
                                    FallbackComponent={ErrorFallback}
                                >
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
        </>
    )
}

export default AppWrapper