import React, { FC, useEffect } from "react"
import ThemeWrapper from "../themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import MaintananceContent from "../maintanance/maintanance";
import { AuthProvider } from "../../context/authContext";
import { SettingsProvider } from "../../context/settings";
import { LayerSwapAppSettings } from "../../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../../Models/LayerSwapSettings";
import ErrorFallback from "../ErrorFallback";
import { SendErrorMessage } from "../../lib/telegram";
import { QueryParams } from "../../Models/QueryParams";
import QueryProvider from "../../context/query";
import { THEME_COLORS, ThemeData } from "../../Models/Theme";
import { TooltipProvider } from "../shadcn/tooltip";
import ColorSchema from "../ColorSchema";
import { IsExtensionError } from "../../helpers/errorHelper";
import { AsyncModalProvider } from "../../context/asyncModal";
import WalletsProviders from "../WalletProviders";
import { useAppRouter } from "../../context/AppRouter/RouterProvider";
import LayerSwapApiClient from "../../lib/layerSwapApiClient";

export type AppPageProps = {
    children?: JSX.Element | JSX.Element[];
    hideFooter?: boolean;
    settings?: LayerSwapSettings;
    apiKey?: string;
    themeData?: ThemeData | null
};

const AppWrapper: FC<AppPageProps> = ({ children, settings, themeData, apiKey }) => {
    const router = useAppRouter();
    LayerSwapApiClient.apiKey = apiKey

    useEffect(() => {
        function prepareUrl(params) {
            const url = new URL(location.href)
            const queryParams = new URLSearchParams(location.search)
            let customUrl = url.protocol + "//" + url.hostname + url.pathname.replace(/\/$/, '')
            for (const paramName of params) {
                const paramValue = queryParams.get(paramName)
                if (paramValue) customUrl = customUrl + '/' + paramValue
            }
            return customUrl
        }
        plausible('pageview', {
            u: prepareUrl([
                'destNetwork', //opsolate
                'sourceExchangeName', //opsolate
                'addressSource', //opsolate
                'from',
                'to',
                'appName',
                'asset',
                'amount',
                'destAddress'
            ])
        })
    }, [])

    if (!settings)
        return <ThemeWrapper>
            <MaintananceContent />
        </ThemeWrapper>

    let appSettings = new LayerSwapAppSettings(settings)

    const query: QueryParams = {
        ...router.query,
        lockNetwork: router.query.lockNetwork === 'true',
        lockExchange: router.query.lockExchange === 'true',
        hideRefuel: router.query.hideRefuel === 'true',
        hideAddress: router.query.hideAddress === 'true',
        hideFrom: router.query.hideFrom === 'true',
        hideTo: router.query.hideTo === 'true',
        lockFrom: router.query.lockFrom === 'true',
        lockTo: router.query.lockTo === 'true',
        lockAsset: router.query.lockAsset === 'true',
        lockFromAsset: router.query.lockFromAsset === 'true',
        lockToAsset: router.query.lockToAsset === 'true',
        hideLogo: router.query.hideLogo === 'true',
        hideDepositMethod: router.query.hideDepositMethod === 'true'
    };

    function logErrorToService(error, info) {
        const extension_error = IsExtensionError(error)
        if (process.env.NEXT_PUBLIC_VERCEL_ENV && !extension_error) {
            SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${info?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
        }
    }

    themeData = themeData || THEME_COLORS.default

    return (
        <>
            {
                themeData &&
                <ColorSchema themeData={themeData} />
            }
            <QueryProvider query={query}>
                <SettingsProvider data={appSettings}>
                    <AuthProvider>
                        <TooltipProvider delayDuration={500}>
                            <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
                                <ThemeWrapper>
                                    <WalletsProviders themeData={themeData} appName={router.query.appName?.toString()}>
                                        <AsyncModalProvider>
                                            {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ?
                                                <MaintananceContent />
                                                : children}
                                        </AsyncModalProvider>
                                    </WalletsProviders>
                                </ThemeWrapper>
                            </ErrorBoundary>
                        </TooltipProvider>
                    </AuthProvider>
                </SettingsProvider >
            </QueryProvider >
        </>
    )
}

export default AppWrapper