import '../styles/globals.css'
import '../styles/dialog-transition.css'
import '../styles/manual-trasnfer-svg.css'
import '../styles/vaul.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';
import { SWRConfig } from 'swr'
import DatadogInit from "../components/datadog-init";
import PartnerLogger from "../components/PartnerLogger";
import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";
import { Analytics } from '@vercel/analytics/react'

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
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 5000,
      }}
    >
      <Analytics />
      <DatadogInit />
      <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
        <Component key={router.asPath} {...pageProps} />
      </IntercomProvider>
      <PartnerLogger />
    </SWRConfig>)
}

export default App