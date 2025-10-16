import React from 'react'
import { Head, Html, Main, NextScript } from 'next/document'

export enum TrackEvent {
  SignedIn = 'Signed in',
  SwapFailed = 'Swap failed',
  SwapInitiated = 'Swap initiated',
}

export default function Document() {
  return (
    <Html lang="en">
      <Head>
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