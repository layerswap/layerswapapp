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
    if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
      SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${info?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
    }
  }

  themeData = themeData || THEME_COLORS.default

  const basePath = router?.basePath ?? ""

  const DynamicRainbowKit = dynamic(() => import("./RainbowKit"), {
    loading: () => <></>
  })

  const DynamicTonConnect = dynamic(() => import("./TonConnectProvider"), {
    loading: () => <></>
  })

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
    {themeData &&
      <style global jsx>{`
          :root {
          --ls-colors-backdrop:${themeData.backdrop};
          --ls-colors-logo: ${themeData.logo};
          --ls-colors-primary: ${themeData.primary?.DEFAULT};
          --ls-colors-primary-50: ${themeData.primary?.[50]};
          --ls-colors-primary-100: ${themeData.primary?.[100]};
          --ls-colors-primary-200: ${themeData.primary?.[200]};
          --ls-colors-primary-300: ${themeData.primary?.[300]};
          --ls-colors-primary-400: ${themeData.primary?.[400]};
          --ls-colors-primary-500: ${themeData.primary?.[500]};
          --ls-colors-primary-600: ${themeData.primary?.[600]};
          --ls-colors-primary-700: ${themeData.primary?.[700]};
          --ls-colors-primary-800: ${themeData.primary?.[800]};
          --ls-colors-primary-900: ${themeData.primary?.[900]};

          --ls-colors-actionButtonText: ${themeData.actionButtonText};
          --ls-colors-text-placeholder: ${themeData.placeholderText};
          --ls-colors-primary-text: ${themeData.primary?.text};
          --ls-colors-primary-text-muted: ${themeData.primary?.textMuted};
          --ls-colors-primary-logoColor: ${themeData.logo};

          --ls-colors-secondary: ${themeData.secondary?.DEFAULT};
          --ls-colors-secondary-50: ${themeData.secondary?.[50]};
          --ls-colors-secondary-100: ${themeData.secondary?.[100]};
          --ls-colors-secondary-200: ${themeData.secondary?.[200]};
          --ls-colors-secondary-300: ${themeData.secondary?.[300]};
          --ls-colors-secondary-400: ${themeData.secondary?.[400]};
          --ls-colors-secondary-500: ${themeData.secondary?.[500]};
          --ls-colors-secondary-600: ${themeData.secondary?.[600]};
          --ls-colors-secondary-700: ${themeData.secondary?.[700]};
          --ls-colors-secondary-800: ${themeData.secondary?.[800]};
          --ls-colors-secondary-900: ${themeData.secondary?.[900]};
          --ls-colors-secondary-950: ${themeData.secondary?.[950]};
          --ls-colors-secondary-text: ${themeData.secondary?.text};
          }
        `}
      </style>
    }
    <QueryProvider query={query}>
      <SettingsProvider data={appSettings}>
        <MenuProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={500}>
              <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
                <ThemeWrapper>
                  <DynamicTonConnect basePath={basePath} themeData={themeData}>
                    <DynamicRainbowKit>
                      {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ?
                        <MaintananceContent />
                        : children}
                    </DynamicRainbowKit>
                  </DynamicTonConnect>
                </ThemeWrapper>
              </ErrorBoundary>
            </TooltipProvider>
          </AuthProvider>
        </MenuProvider>
      </SettingsProvider >
    </QueryProvider>
  </>)
}
