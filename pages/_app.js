import '../styles/globals.css'
import '../styles/dialog-transition.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';
import { SWRConfig } from 'swr'

const INTERCOM_APP_ID = 'h5zisg78'
const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
import "@rainbow-me/rainbowkit/styles.css";
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import {
  darkTheme,
  getDefaultWallets,
  RainbowKitProvider,
  connectorsForWallets
} from '@rainbow-me/rainbowkit';
import useStorage from "../hooks/useStorage";

import { supportedChains } from '../lib/chainConfigs';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet } from '@rainbow-me/rainbowkit/wallets';

const { chains, publicClient } = configureChains(
  supportedChains,
  [
    publicProvider()
  ]
);

const { wallets } = getDefaultWallets({
  appName: 'Layerswap',
  chains,
  projectId: WALLETCONNECT_PROJECT_ID
});

const projectId = WALLETCONNECT_PROJECT_ID;
const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ projectId, chains }),
      coinbaseWallet({ chains, appName: 'Layerswap RainbowKit App' }),
      walletConnectWallet({ projectId, chains }),
    ],
  },
  {
    groupName: 'Others',
    wallets: [
      rainbowWallet({ projectId, chains }),
      bitKeepWallet({ projectId, chains }),
    ],
  },
]);

function App({ Component, pageProps }) {



  const theme = darkTheme({
    accentColor: 'rgb(var(--colors-primary-500))',
    accentColorForeground: 'white',
    borderRadius: 'small',
    fontStack: 'system',
    overlayBlur: 'small',
  })

  theme.colors.modalBackground = 'rgb(var(--colors-secondary-900))'

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

  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
  })

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
      }}
    >
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider modalSize="compact" chains={chains} theme={theme}>
            <Component key={router.asPath} {...pageProps} />
          </RainbowKitProvider>
        </WagmiConfig>
      </IntercomProvider>
    </SWRConfig>)
}

export default App