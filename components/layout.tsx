import Navbar from "./navbar"
import React from "react"
import Head from "next/head"
import FooterComponent from "./footerComponent"

type Props = {
  children: JSX.Element | JSX.Element[],
  hasSideShapes?: boolean
};

export default function Layout({ hasSideShapes, children }: Props) {
  return (<>
    <Head>
      <title>Layerswap</title>
      <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png" />
      <link rel="manifest" href="favicon/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#111827" />

      <meta name="description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />

      {/* Facebook Meta Tags */}
      <meta property="og:url" content="https://www.layerswap.io/" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="LayerSwap - Move crypto to Layer 2" />
      <meta property="og:description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />
      <meta property="og:image" content="https://layerswap.io/opengraph.jpg" />

      {/* Twitter Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content="layerswap.io" />
      <meta property="twitter:url" content="https://www.layerswap.io/" />
      <meta name="twitter:title" content="LayerSwap - Move crypto to Layer 2" />
      <meta name="twitter:description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />
      <meta name="twitter:image" content="https://layerswap.io/opengraphtw.jpg" />
      <script defer data-domain="layerswap.io" src="https://plausible.io/js/plausible.js"></script>
    </Head>
    <main>
      <div className="overflow-hidden relative font-robo">
        <div className="top-backdrop"></div>
        <Navbar></Navbar>
        <div className="flex content-center items-center justify-center mb-5 space-y-5 flex-col  container mx-auto sm:px-6 lg:px-8 max-w-3xl">
          {children}
        </div>
        <FooterComponent />
        {/* {hasSideShapes && hasSideShapes == true ? <>
          <BackgroundCircle className="md:w-52 md:h-52 lg:h-full lg:w-96 top-32 lg:top-0 -right-40 lg:-right-60 fixed w-0 h-0" />
          <BackgroundRectangle className="md:w-52 md:h-52 lg:h-full lg:w-96 top-64 lg:top-36 -left-40 lg:-left-60 fixed w-0 h-0" />
        </> : null} */}
      </div>
    </main>
  </>)
}