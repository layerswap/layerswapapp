import React from 'react'
import { Head, Html, Main, NextScript } from 'next/document'

export enum TrackEvent {
  SignedIn = 'Signed in',
  SwapFailed = 'Swap failed',
  SwapInitiated = 'Swap initiated',
}

type PlausibleArgs = [TrackEvent, () => void] | [TrackEvent] | any

declare global {
  const plausible: {
    (...args: PlausibleArgs): void
    q?: PlausibleArgs[]
  }

  interface Window {
    plausible?: typeof plausible
    safary?: {
      track: (args: {
        eventType: string
        eventName: string
        parameters?: { [key: string]: string | number | boolean }
      }) => void
    }
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
              `var script=document.createElement('script');script.src="https://tag.safary.club/stag-0.1.16.js";script.async=true;script.setAttribute('data-name','safary-sdk');script.setAttribute('data-product-id','prd_BQMGPwHTdO');script.integrity="sha256-jl67N5KgpOXS3tLPc6pUXU1UxJqBm9LUZtqX5H3jZ2U=";script.crossOrigin="anonymous";var target=document.head||document.body;target.appendChild(script);`
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if(typeof window !== "undefined" && !window.location.pathname.includes("nocookies")){try { localStorage.getItem("ls-ls-test"); }catch (e) { window.location.href = "/app/nocookies"; }}',
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