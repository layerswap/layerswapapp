import '../styles/globals.css'
import '../styles/dialog-transition.css'
import '../styles/manual-trasnfer-svg.css'
import '../styles/vaul.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';
import { SWRConfig } from 'swr'
import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";
import posthog from "posthog-js";
import { PostHogProvider } from '@posthog/react'
import { useEffect } from 'react';

const progress = new ProgressBar({
  size: 2,
  color: "rgb(var(--ls-colors-primary))",
  className: "bar-of-progress",
  delay: 100,
});

Router.events.on("routeChangeStart", progress.start);
Router.events.on("routeChangeComplete", progress.finish);
Router.events.on("routeChangeError", progress.finish);

const INTERCOM_APP_ID = 'h5zisg78'

function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY && typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        capture_pageview: 'history_change',
        capture_pageleave: true,
        api_host: `${router.basePath || ''}/lsph`,
        ui_host: 'https://us.posthog.com',
        defaults: '2025-05-24',
        before_send: (event) => {
          if (event?.event === '$exception') {
            const exceptionList = event.properties?.$exception_list || [];
            const isResizeObserverError = exceptionList.some(
              (exception) =>
                exception.value?.includes('ResizeObserver loop') ||
                exception.type?.includes('ResizeObserver loop')
            );
            if (isResizeObserverError) {
              return null;
            }
          }
          return event;
        },
      });
    }
  }, [router.basePath]);

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
      }}
    >
      <PostHogProvider client={posthog}>
        <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
          <Component key={router.asPath} {...pageProps} />
        </IntercomProvider>
      </PostHogProvider>
    </SWRConfig>)
}

export default App