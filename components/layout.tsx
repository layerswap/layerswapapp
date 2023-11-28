import React, { useEffect } from "react"
import Head from "next/head"
import { useRouter } from "next/router";
import ThemeWrapper from "./themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import MaintananceContent from "./maintanance/maintanance";
import { AuthProvider } from "../context/authContext";
import { SettingsProvider } from "../context/settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { MenuProvider } from "../context/menu";
import ErrorFallback from "./ErrorFallback";
import { SendErrorMessage } from "../lib/telegram";
import dynamic from 'next/dynamic'
import { QueryParams } from "../Models/QueryParams";
import QueryProvider from "../context/query";
import LayerSwapAuthApiClient from "../lib/userAuthApiClient";
import { THEME_COLORS, ThemeData } from "../Models/Theme";
import { TooltipProvider } from "./shadcn/tooltip";
import ColorSchema from "./ColorSchema";
import TonConnectProvider from "./TonConnectProvider";
import * as Sentry from "@sentry/nextjs";

type Props = {
  children: JSX.Element | JSX.Element[];
  hideFooter?: boolean;
  settings?: LayerSwapSettings;
  themeData?: ThemeData | null
};

export default function Layout({ children, settings, themeData }: Props) {
  const router = useRouter();

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
        'amount'
      ])
    })
  }, [])

  if (!settings)
    return <ThemeWrapper>
      <MaintananceContent />
    </ThemeWrapper>

  let appSettings = new LayerSwapAppSettings(settings)
  LayerSwapAuthApiClient.identityBaseEndpoint = appSettings.discovery.identity_url

  const query: QueryParams = {
    ...router.query,
    ...(router.query.lockAddress === 'true' ? { lockAddress: true } : {}),
    ...(router.query.lockNetwork === 'true' ? { lockNetwork: true } : {}),
    ...(router.query.lockExchange === 'true' ? { lockExchange: true } : {}),
    ...(router.query.hideRefuel === 'true' ? { hideRefuel: true } : {}),
    ...(router.query.hideAddress === 'true' ? { hideAddress: true } : {}),
    ...(router.query.hideFrom === 'true' ? { hideFrom: true } : {}),
    ...(router.query.hideTo === 'true' ? { hideTo: true } : {}),
    ...(router.query.lockFrom === 'true' ? { lockFrom: true } : {}),
    ...(router.query.lockTo === 'true' ? { lockTo: true } : {}),
    ...(router.query.lockAsset === 'true' ? { lockAsset: true } : {}),


    ...(router.query.lockAddress === 'false' ? { lockAddress: false } : {}),
    ...(router.query.lockNetwork === 'false' ? { lockNetwork: false } : {}),
    ...(router.query.lockExchange === 'false' ? { lockExchange: false } : {}),
    ...(router.query.hideRefuel === 'false' ? { hideRefuel: false } : {}),
    ...(router.query.hideAddress === 'false' ? { hideAddress: false } : {}),
    ...(router.query.hideFrom === 'false' ? { hideFrom: false } : {}),
    ...(router.query.hideTo === 'false' ? { hideTo: false } : {}),
    ...(router.query.lockFrom === 'false' ? { lockFrom: false } : {}),
    ...(router.query.lockTo === 'false' ? { lockTo: false } : {}),
    ...(router.query.lockAsset === 'false' ? { lockAsset: false } : {}),
  };

  function logErrorToService(error, info) {

    const transaction = Sentry.startTransaction({
      name: "error_boundary_handler",
    });
    Sentry.configureScope((scope) => {
      scope.setSpan(transaction);
    });
    if (process.env.NEXT_PUBLIC_VERCEL_ENV && !error.stack.includes("chrome-extension")) {
      SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${info?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
    }
    Sentry.captureException(error, info);
    transaction.finish();
  }

  themeData = themeData || THEME_COLORS.default

  const basePath = router?.basePath ?? ""

  const DynamicRainbowKit = (dynamic(() => import("./RainbowKit"), {
    loading: () => <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
      <div className='text-center text-xl text-secondary-100'>
      </div>
      <div className="relative px-6">
        <div className="flex items-start">
          <div className={`flex flex-nowrap grow`}>
            <div className="w-full pb-6 flex flex-col justify-between space-y-5 text-secondary-text h-full">
              <div className="sm:min-h-[504px]"></div>
            </div>
          </div>
        </div>
      </div>
      <div id="widget_root" />
    </div>,
    ssr: false
  }))



  return (<>
    <Head>
      <title>Layerswap</title>
      <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon/favicon-16x16.png`} />
      <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content={`rgb(${themeData.secondary?.[900]})`} />
      <meta name="description" content="Move crypto across exchanges, blockchains, and wallets." />

      {/* Facebook Meta Tags */}
      <meta property="og:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap" />
      <meta property="og:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta property="og:image" content={`https://layerswap.io/${basePath}/opengraph.jpg?v=2`} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta name="twitter:title" content="Layerswap" />
      <meta name="twitter:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta name="twitter:image" content={`https://layerswap.io/${basePath}/opengraphtw.jpg`} />
    </Head>
    {
      themeData &&
      <ColorSchema themeData={themeData} />
    }
    <QueryProvider query={query}>
      <SettingsProvider data={appSettings}>
        <MenuProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={500}>
              <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
                <ThemeWrapper>
                  <TonConnectProvider basePath={basePath} themeData={themeData}>
                    <DynamicRainbowKit>
                      {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ?
                        <MaintananceContent />
                        : children}
                    </DynamicRainbowKit>
                  </TonConnectProvider>
                </ThemeWrapper>
              </ErrorBoundary>
            </TooltipProvider>
          </AuthProvider>
        </MenuProvider>
      </SettingsProvider >
    </QueryProvider>
  </>)
}
