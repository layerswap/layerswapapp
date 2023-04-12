import '../styles/globals.css'
import '../styles/dialog-transition.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';

const INTERCOM_APP_ID = 'h5zisg78'
import "@rainbow-me/rainbowkit/styles.css";
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import {
  darkTheme,
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';

import { supportedChains } from '../lib/chainConfigs';
import { publicProvider } from 'wagmi/providers/public';

function App({ Component, pageProps }) {
  const { chains, provider } = configureChains(
    supportedChains,
    [
      publicProvider()
    ]
  );

  const { connectors } = getDefaultWallets({
    appName: 'Layerswap',
    chains
  });

  const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider
  })

  const theme = darkTheme({
    accentColor: '#E42575',
    accentColorForeground: 'white',
    borderRadius: 'small',
    fontStack: 'system',
    overlayBlur: 'small',
  })

  theme.colors.modalBackground = '#0e1426'

  const router = useRouter()
  return (
    <IntercomProvider appId={INTERCOM_APP_ID}>
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider modalSize="compact" chains={chains} theme={theme}>
          <Component key={router.asPath} {...pageProps} />
        </RainbowKitProvider>
      </WagmiConfig>
    </IntercomProvider>)
}

export default App