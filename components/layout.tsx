import React, { useEffect } from "react"
import Head from "next/head"
import { useRouter } from "next/router";
import ThemeWrapper from "./themeWrapper";
import { ErrorBoundary } from "react-error-boundary";
import MaintananceContent from "./maintanance/maintanance";
import { SettingsProvider } from "../context/settings";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import ErrorFallback from "./ErrorFallback";
import { SendErrorMessage } from "../lib/telegram";
import { QueryParams } from "../Models/QueryParams";
import QueryProvider from "../context/query";
import { THEME_COLORS, ThemeData } from "../Models/Theme";
import { TooltipProvider } from "./shadcn/tooltip";
import ColorSchema from "./ColorSchema";
import { IsExtensionError } from "../helpers/errorHelper";
import { AsyncModalProvider } from "../context/asyncModal";
import WalletsProviders from "./WalletProviders";
import { SwapAccountsProvider } from "@/context/swapAccounts";
import posthog from "posthog-js";

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
    const trackPageview = () => {
      const customUrl = prepareUrl([
        'destNetwork', // obsolete
        'sourceExchangeName', // obsolete
        'addressSource', // obsolete
        'from',
        'to',
        'appName',
        'asset',
        'amount',
        'destAddress'
      ])

      posthog.capture('$pageview', {
        custom_url: customUrl,
      })
    }

    trackPageview()
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


  const basePath = router?.basePath ?? ""
  const isCanonical = (router.pathname === "/app" || router.pathname === "/") && Object.keys(router.query).length === 0;
  return (<>
    <Head>
      <title>Layerswap App I Bridge & Swap Tokens Across Chains</title>
      <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon/favicon-16x16.png`} />
      <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content={`rgb(${themeData?.secondary?.[900] || THEME_COLORS.default.secondary?.[900]})`} />
      <meta name="description" content="Layerswap is the most affordable way to swap & bridge crypto assets across Solana, Ethereum, Bitcoin, Starknet, TON, Fuel, and 80+ more blockchains." />
      {isCanonical && <link rel="canonical" href="https://layerswap.io/app/" />}

      {/* Facebook Meta Tags */}
      <meta property="og:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap App I Bridge & Swap Tokens Across Chains" />
      <meta property="og:description" content="Layerswap is the most affordable way to swap & bridge crypto assets across Solana, Ethereum, Bitcoin, Starknet, TON, Fuel, and 80+ more blockchains." />
      <meta property="og:image" content={`https://layerswap.io/${basePath}/opengraph.jpg?v=2`} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta name="twitter:title" content="Layerswap App I Bridge & Swap Tokens Across Chains" />
      <meta name="twitter:description" content="Layerswap is the most affordable way to swap & bridge crypto assets across Solana, Ethereum, Bitcoin, Starknet, TON, Fuel, and 80+ more blockchains." />
      <meta name="twitter:image" content={`https://layerswap.io/${basePath}/opengraphtw.jpg`} />

      <meta name="color-scheme" content="light dark"></meta>
    </Head>
    {
      <ColorSchema themeData={themeData} />
    }
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
      <TooltipProvider delayDuration={400}>
        <QueryProvider query={query}>
          <SettingsProvider data={appSettings}>
            <WalletsProviders basePath={basePath} themeData={themeData || THEME_COLORS.default} appName={router.query.appName?.toString()}>
              <SwapAccountsProvider>
                <ThemeWrapper>
                  <AsyncModalProvider>
                    {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ?
                      <MaintananceContent />
                      : children}
                  </AsyncModalProvider>
                </ThemeWrapper>
              </SwapAccountsProvider>
            </WalletsProviders>
          </SettingsProvider >
        </QueryProvider >
      </TooltipProvider>
    </ErrorBoundary>
  </>)
}
