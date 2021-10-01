import BackgroundRectangle from "./icons/backgroundRectangle"
import BackgroundCircle from "./icons/backgroundCircle"
import Navbar from "./navbar"
import React from "react"
import Head from "next/head"

export default function Layout({ children }) {
  return (<>
    <Head>
      <title>LayerSwap</title>
      <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png" />
      <link rel="manifest" href="favicon/site.webmanifest" />
      <link rel="mask-icon" href="favicon/safari-pinned-tab.svg" color="#5bbad5" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="LayerSwap - Move crypto to Layer 2" />
      <meta property="og:url" content="https://layerswap.io/" />
      <meta property="og:image" content="https://layerswap.io/opengraph.png" />
      <meta property="og:description" content="Move crypto from Binance or Coinbase to Arbitrum One - save 10x on fees." />
    </Head>
    <main>
      <div className="overflow-hidden relative">
        <Navbar></Navbar>
        <div>
          {children}
        </div>
        <BackgroundCircle className="md:w-60 md:h-60 lg:h-full lg:w-96 top-32 lg:top-0 -right-40 lg:-right-60 fixed w-0 h-0" />
        <BackgroundRectangle className="md:w-60 md:h-60 lg:h-full lg:w-96 top-64 lg:top-36 -left-40 lg:-left-60 fixed w-0 h-0" />
      </div>
    </main>
  </>)
}