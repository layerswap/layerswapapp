import '../styles/globals.css'
import '@layerswap/widget/index.css'
import { useRouter } from "next/router";
import { SWRConfig } from 'swr'
import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";
import { useEffect, useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { IntercomProvider } from 'react-use-intercom';
import { markPostHogReady } from '../lib/posthog';

const INTERCOM_APP_ID = 'h5zisg78'

const progress = new ProgressBar({
  size: 2,
  color: "rgb(var(--ls-colors-primary))",
  className: "bar-of-progress",
  delay: 100,
});

Router.events.on("routeChangeStart", progress.start);
Router.events.on("routeChangeComplete", progress.finish);
Router.events.on("routeChangeError", progress.finish);

function App({ Component, pageProps }) {
  const router = useRouter()

  // Intercom needs a provider in scope for pages that render outside the
  // widget surface (e.g. /404 uses `useIntercom()` directly). We keep the
  // provider mounted but flip `shouldInitialize` only after the browser is
  // idle so the third-party script (~342 KB) does not compete with the
  // critical-path render. The widget's own LayerswapProvider applies the
  // same gate independently for the in-widget tree.
  const [intercomReady, setIntercomReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const idle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 200))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => setIntercomReady(true), { timeout: 6000 })
    return () => cancel?.(id)
  }, [])

  // PostHog is initialized on idle (or shortly after if rIC is unavailable).
  // Nothing in this app uses @posthog/react's hooks/provider, so we can
  // dynamic-import the SDK and drop ~165 KB of eager JS. Captures elsewhere
  // in the app must go through `lib/posthog`'s `capture()` — posthog-js
  // drops (does not queue) captures fired before init, and that helper
  // holds them until `markPostHogReady` is called below.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) {
      markPostHogReady(null)
      return
    }

    const idle = window.requestIdleCallback ?? ((cb) => window.setTimeout(cb, 200))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout

    const id = idle(async () => {
      const { default: posthog } = await import('posthog-js')
      posthog.init(key, {
        capture_pageview: 'history_change',
        capture_pageleave: true,
        api_host: `${router.basePath || ''}/lsph`,
        ui_host: 'https://us.posthog.com',
        defaults: '2025-05-24',
        before_send: (event) => {
          if (event?.event === '$exception') {
            const exceptionList = event.properties?.$exception_list || []
            const isResizeObserverError = exceptionList.some(
              (exception) =>
                exception.value?.includes('ResizeObserver loop') ||
                exception.type?.includes('ResizeObserver loop')
            )
            if (isResizeObserverError) return null
          }
          return event
        },
      })
      markPostHogReady(posthog)
    }, { timeout: 5000 })

    return () => cancel?.(id)
  }, [router.basePath]);

  return (
    <>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          dedupingInterval: 5000,
        }}
      >
        <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500} shouldInitialize={intercomReady}>
          <Component key={router.asPath} {...pageProps} />
        </IntercomProvider>
      </SWRConfig>
      <SpeedInsights />
      <Analytics />
    </>)
}

export default App
