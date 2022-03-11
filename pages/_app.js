import '../styles/globals.css'
import { Web3ReactProvider } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'

const getLibrary = () => {
  const provider = window.web3.currentProvider
  return new Web3Provider(provider)
}

function App({ Component, pageProps }) {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Component {...pageProps} />
    </Web3ReactProvider>)
}

export default App