import React from 'react'
import Document, { Head, Html, Main, NextScript } from 'next/document'

export enum TrackEvent {
  SignedIn = 'Successfully signed in',
  SwapFailed = ' Got to Swap failed page'
}

type PlausibleArgs = [TrackEvent, () => void] | [TrackEvent]

declare global {
  const plausible: {
    (...args: PlausibleArgs): void
    q?: PlausibleArgs[]
  }

  interface Window {
    plausible?: typeof plausible
  }
}

export default class extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script
            defer
            data-domain={process.env.NEXT_PUBLIC_VERCEL_URL == 'https://layerswapapp-qgdd8zcts-layerswap.vercel.app/' && "testnet.layerswap.io"}
            src="https://plausible.io/js/script.tagged-events.js"
          />
          <script
            dangerouslySetInnerHTML={{
              __html:
                'window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }',
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
}