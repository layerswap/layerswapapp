import React from 'react'
import { Head, Html, Main, NextScript } from 'next/document'

export enum TrackEvent {
  SignedIn = 'Signed in',
  SwapFailed = 'Swap failed',
}

type PlausibleArgs = [TrackEvent, () => void] | [TrackEvent] | any

declare global {
  const plausible: {
    (...args: PlausibleArgs): void
    q?: PlausibleArgs[]
  }

  interface Window {
    plausible?: typeof plausible
  }
}

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <script
          defer
          data-domain={process.env.NEXT_PUBLIC_VERCEL_ENV == 'production' ? 'layerswap.io' : "testnet.layerswap.io"}
          src="https://plausible.io/js/script.tagged-events.js"
        />}
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <script
          defer
          data-domain={process.env.NEXT_PUBLIC_VERCEL_ENV == 'production' ? 'layerswap.io' : "testnet.layerswap.io"}
          src="https://plausible.io/js/script.manual.js"
        />}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if(typeof window !== "undefined" && !window.location.pathname.includes("nocookies")){try { localStorage.getItem("ls-ls-test"); }catch (e) { window.location.href = "/nocookies"; }}',
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}