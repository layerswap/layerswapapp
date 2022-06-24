import '../styles/globals.css'
import { Web3ReactProvider } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import { useRouter } from "next/router";

const getLibrary = () => {
  const provider = window.web3.currentProvider
  return new Web3Provider(provider)
}

function App({ Component, pageProps }) {
  const router = useRouter()
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Component key={router.asPath} {...pageProps} />
    </Web3ReactProvider>)
}

export default App