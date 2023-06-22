import React, { useEffect } from "react"
import Head from "next/head"
import { useRouter } from "next/router";
import QueryProvider from "../context/query";
import ThemeWrapper from "./themeWrapper";
import ErrorBoundary from "./ErrorBoundary";
import { QueryParams } from "../Models/QueryParams";
import MaintananceContent from "./maintanance/maintanance";
import { AuthProvider } from "../context/authContext";
import TokenService from "../lib/TokenService";
import NoCookies from "./NoCookies";
import useStorage from "../hooks/useStorage";
import { ParsedUrlQuery } from "querystring";

type Props = {
  children: JSX.Element | JSX.Element[];
  hideFooter?: boolean;
  hideNavbar?: boolean;
};



export default function Layout({ hideFooter, hideNavbar, children }: Props) {
  const router = useRouter();
  const { storageAvailable } = useStorage();

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
    plausible('pageview', { u: prepareUrl(['destNetwork', 'sourceExchangeName', 'addressSource', 'asset', 'amount']) })
  }, [])

  return (<>
    <Head>
      <title>Layerswap</title>
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
      <link rel="manifest" href="favicon/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#111827" />
      <meta name="description" content="Move crypto across exchanges, blockchains, and wallets." />

      {/* Facebook Meta Tags */}
      <meta property="og:url" content="https://www.layerswap.io/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap" />
      <meta property="og:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta property="og:image" content="https://layerswap.io/opengraph.jpg?v=2" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content="https://www.layerswap.io/" />
      <meta name="twitter:title" content="Layerswap" />
      <meta name="twitter:description" content="Move crypto across exchanges, blockchains, and wallets." />
      <meta name="twitter:image" content="https://layerswap.io/opengraphtw.jpg" />
    </Head>
    {
      storageAvailable === true &&
      <AuthProvider>
        <ErrorBoundary >
          <QueryProvider query={query}>
            <ThemeWrapper hideNavbar={hideNavbar}>
              {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true' ? <MaintananceContent /> : children}
            </ThemeWrapper>
          </QueryProvider>
        </ErrorBoundary>
      </AuthProvider>
    }
    {storageAvailable === false &&
      <NoCookies />
    }
  </>)
}
