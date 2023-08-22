import '../styles/globals.css'
import '../styles/dialog-transition.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';
import { SWRConfig } from 'swr'

const INTERCOM_APP_ID = 'h5zisg78'
import "@rainbow-me/rainbowkit/styles.css";
import useStorage from "../hooks/useStorage";
import RainbowKitComponent from '../components/RainbowKit'

function App({ Component, pageProps }) {
  const router = useRouter()

  const { storageAvailable } = useStorage();

  if (!storageAvailable) {
    return (
      <SWRConfig
        value={{
          revalidateOnFocus: false,
        }}
      >
        <IntercomProvider appId={INTERCOM_APP_ID}>
          <Component key={router.asPath} {...pageProps} />
        </IntercomProvider>
      </SWRConfig>)
  }

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
      }}
    >
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <RainbowKitComponent Component={Component} pageProps={pageProps} />
      </IntercomProvider>
    </SWRConfig>)
}

export default App