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
      <title>LayerSwap</title>
      <link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="favicon/favicon-16x16.png" />
      <link rel="manifest" href="favicon/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#111827" />
      
      <script type="text/javascript" 
        dangerouslySetInnerHTML={{
          __html: `
            window.Intercom("boot", {
              api_base: "https://api-iam.intercom.io",
              app_id: "h5zisg78"
            });
          `,
        }}
      > 
      </script>

      <script type="text/javascript" 
        dangerouslySetInnerHTML={{
          __html: `
            (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/h5zisg78';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
          `,
        }}
      > 
      </script>
      
      <script type="text/javascript" 
        dangerouslySetInnerHTML={{
          __html: `
            window.Intercom("update");
          `,
        }}
      > 
      </script>

      <meta name="description" content="Move crypto from CEX to L2. Instant and gasless." />

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
      <div className="overflow-hidden relative">
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