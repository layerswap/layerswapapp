import '../styles/globals.css'
import { Web3ReactProvider } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import { IntercomProvider } from 'react-use-intercom';

const getLibrary = () => {
  const provider = window.web3.currentProvider
  return new Web3Provider(provider)
}

const INTERCOM_APP_ID = 'h5zisg78';

function App({ Component, pageProps }) {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <IntercomProvider autoBoot={true} appId={INTERCOM_APP_ID}>
        <Component {...pageProps} />
      </IntercomProvider>
    </Web3ReactProvider>)
}

export default App