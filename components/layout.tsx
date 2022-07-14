import Navbar from "./navbar"
import React, { useEffect, useState } from "react"
import Head from "next/head"
import FooterComponent from "./footerComponent"
import { useRouter } from "next/router";

type Props = {
  children: JSX.Element | JSX.Element[],
  hasSideShapes?: boolean
};

export default function Layout({ hasSideShapes, children }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = (url) => (url !== router.asPath) && setLoading(true);
    const handleComplete = (url) => (url === router.asPath) && setLoading(false);

    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)

    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  })

  return (<>
    <Head>
      <title>Layerswap</title>
      <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png" />
      <link rel="manifest" href="favicon/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#111827" />
<<<<<<< HEAD

      <meta name="description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />
=======
 
      <meta name="description" content="Move crypto from CEX to L2. Instant and gasless." />
>>>>>>> main

      {/* Facebook Meta Tags */}
      <meta property="og:url" content="https://www.layerswap.io/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Layerswap - Accelerating L2 migration" />
      <meta property="og:description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />
      <meta property="og:image" content="https://layerswap.io/opengraph.jpeg" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content="https://www.layerswap.io/" />
      <meta name="twitter:title" content="Layerswap - Accelerating L2 migration" />
      <meta name="twitter:description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />
      <meta name="twitter:image" content="https://layerswap.io/opengraphtw.jpeg" />
      <script defer data-domain="layerswap.io" src="https://plausible.io/js/plausible.js"></script>
    </Head>
    <main>
      <div className="overflow-hidden relative font-robo">
        <div className="top-backdrop"></div>
        <Navbar></Navbar>
        <>
          {children}
        </>
        <FooterComponent />
      </div>
    </main>
  </>)
}