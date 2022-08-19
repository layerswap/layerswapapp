import Navbar from "./navbar"
import React, { useEffect, useRef, useState } from "react"
import Head from "next/head"
import FooterComponent from "./footerComponent"
import { useRouter } from "next/router";
import { Toaster } from 'react-hot-toast';
import { SildeOverRef } from "./SlideOver";


type Props = {
  children: JSX.Element | JSX.Element[];
  hideFooter?: boolean;
  hideNavbar?: boolean;
};

export default function Layout({ hideFooter, hideNavbar, children }: Props) {
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
      <meta name="description" content="Move crypto from Binance or Coinbase to Arbitrum and Optimism - save 10x on fees." />

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
    <div className="scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
      <main className="scrollbar:!w-1.5 scrollbar:!h-1.5 scrollbar:bg-darkblue-500 scrollbar-track:!bg-slate-100 scrollbar-thumb:!rounded scrollbar-thumb:!bg-slate-300 scrollbar-track:!rounded scrollbar-track:!bg-slate-500/[0.16] scrollbar-thumb:!bg-slate-500/50">
        <div className="min-h-screen overflow-hidden relative font-robo">
          <Toaster position="top-center" toastOptions={{ duration: 5000, style: { background: '#131E36', color: '#a4afc8' }, error: { position: 'top-center' } }} />
          <div className={`top-backdrop ${loading ? 'animate-pulse' : ''}`}></div>

          {hideNavbar ?? <Navbar />}
          <div className={loading ? "animate-pulse" : ""}>
            {children}
          </div>
          {hideFooter ?? <FooterComponent />}
        </div>
      </main>
    </div>
  </>)
}


const Sceleton = () => {
  return <div className="animate-pulse opacity-60 w-full px-3 md:px-8 py-12 rounded-lg  bg-darkBlue max-w-2xl mx-auto shadow-card align-middle shadow-xl transition-all">
    <div className='flex place-content-center mt-20 mb-16 md:mb-8'>
      <div className='relative'>
        <div className='absolute top-1 left-1 w-10 h-10 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
        <div className='absolute top-2 left-2 w-8 h-8 opacity-40 bg bg-pink-primary rounded-full animate-ping'></div>
        <div className='relative top-0 left-0 w-12 h-12 scale-75 bg bg-pink-primary-800 rounded-full'></div>
      </div>
    </div>
  </div>
}