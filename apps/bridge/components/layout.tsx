import { THEME_COLORS, ThemeData } from "@layerswap/widget";
import { useRouter } from 'next/router';
import Head from "next/head";
import AppWrapper from "./AppWrapper";
import { useEffect } from "react";
import type { JSX } from 'react';
import { capture } from "../lib/posthog";

type Props = {
  children: JSX.Element | JSX.Element[];
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

    // This fires before `_app.js`'s idle-time posthog init, and posthog-js
    // drops pre-init captures — `capture` from lib/posthog holds the event
    // until init completes, keeping posthog-js out of this eager chunk.
    capture('$pageview', { custom_url: customUrl })
  }, [])

  return (<>
    <Head>
      <title>Layerswap App I Bridge & Swap Tokens Across Chains</title>
      <link rel="icon" type="image/png" href={`${basePath}/favicon/favicon-96x96.png`} sizes="96x96" />
      <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon/favicon.svg`} />
      <link rel="shortcut icon" href={`${basePath}/favicon/favicon.ico`} />
      <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/favicon/apple-touch-icon.png`} />
      <link rel="manifest" href={`${basePath}/favicon/site.webmanifest`} />
      <meta name="apple-mobile-web-app-title" content="Layerswap" />
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
    <AppWrapper>
      {children}
    </AppWrapper>
  </>)
}
