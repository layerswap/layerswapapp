import { LayerSwapSettings, THEME_COLORS, ThemeData } from "@layerswap/widget";
import { useRouter } from 'next/router';
import Head from "next/head";
import AppWrapper from "./AppWrapper";
import { useEffect } from "react";
import posthog from "posthog-js";

type Props = {
  children: JSX.Element | JSX.Element[];
  settings?: LayerSwapSettings;
  themeData?: ThemeData | null
};

export default function Layout({ children, themeData }: Props) {
  const router = useRouter();

  themeData = themeData || THEME_COLORS.default

  const basePath = router?.basePath ?? ""
  const isCanonical = (router.pathname === "/app" || router.pathname === "/") && Object.keys(router.query).length === 0;

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

  return (<>
    <Head>
      <title>Layerswap App</title>
      <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
      <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon/favicon-32x32.png`} />
      <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon/favicon-16x16.png`} />
      <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content={`rgb(${themeData.secondary?.[900]})`} />
      <meta name="description" content="Streamline your asset transaction experience with Layerswap across 50+ blockchains and 15+ exchanges. Fast, affordable and secure." />
      {isCanonical && <link rel="canonical" href="https://layerswap.io/app/" />}

      {/* Facebook Meta Tags */}
      <meta property="og:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap App" />
      <meta property="og:description" content="Streamline your asset transaction experience with Layerswap across 50+ blockchains and 15+ exchanges. Fast, affordable and secure." />
      <meta property="og:image" content={`https://layerswap.io/${basePath}/opengraph.jpg?v=2`} />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content={`https://www.layerswap.io/${basePath}`} />
      <meta name="twitter:title" content="Layerswap App" />
      <meta name="twitter:description" content="Streamline your asset transaction experience with Layerswap across 50+ blockchains and 15+ exchanges. Fast, affordable and secure." />
      <meta name="twitter:image" content={`https://layerswap.io/${basePath}/opengraphtw.jpg`} />

      <meta name="color-scheme" content="light dark"></meta>
    </Head>
    <AppWrapper>
      {children}
    </AppWrapper>
  </>)
}
