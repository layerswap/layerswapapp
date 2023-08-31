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
  RainbowKitProvider,
  connectorsForWallets
} from '@rainbow-me/rainbowkit';
import useStorage from "../hooks/useStorage";

import { supportedChains } from '../lib/chainConfigs';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';

const { chains, publicClient } = configureChains(
  supportedChains,
  [
    publicProvider()
  ]
);

const projectId = WALLETCONNECT_PROJECT_ID;
const connectors = connectorsForWallets([
  {
    groupName: 'Popular',
    wallets: [
      metaMaskWallet({ projectId, chains }),
      walletConnectWallet({ projectId, chains }),
    ],
  },
  {
    groupName: 'Wallets',
    wallets: [
      coinbaseWallet({ chains, appName: 'Layerswap' }),
      argentWallet({ projectId, chains }),
      bitKeepWallet({ projectId, chains }),
      rainbowWallet({ projectId, chains }),
    ],
  },
]);

function App({ Component, pageProps }) {

  const theme = darkTheme({
    accentColor: 'var(--ls-colors-primary-500)',
    accentColorForeground: 'white',
    borderRadius: 'small',
    fontStack: 'system',
    overlayBlur: 'small',
  })


  // // theme.colors.actionButtonBorder = 'var(--ls-colors-primary-500)';
  // // theme.colors.actionButtonBorderMobile = "#0f0";
  // // theme.colors.actionButtonSecondaryBackground = "#0f0";
  // theme.colors.closeButton = "rgb(var(--ls-colors-secondary-500))";
  // // theme.colors.closeButtonBackground = "var(--ls-colors-secondary-700)";
  // // theme.colors.connectButtonBackground = "#0f0";
  // // theme.colors.connectButtonBackgroundError = "var(--ls-colors-secondary-500)";
  // // theme.colors.connectButtonInnerBackground = "#0f0";
  // // theme.colors.connectButtonText = "#0f0";
  // // theme.colors.connectButtonTextError = "#0f0";
  // // theme.colors.connectionIndicator = "#0f0";
  // // theme.colors.downloadBottomCardBackground = "#0f0";
  // // theme.colors.downloadTopCardBackground = "#0f0";
  // // theme.colors.error = "#0f0";
  // // theme.colors.generalBorder = "#0f0";
  // // theme.colors.generalBorderDim = "#0f0";
  // // theme.colors.menuItemBackground = "#0f0";
  // // theme.colors.modalBackdrop = "#0f0";
  // // theme.colors.modalBackground = "#0f0";
  // // theme.colors.modalBorder = "#0f0";
  // // theme.colors.modalText = "#0f0";
  // // theme.colors.modalTextDim = "#0f0";
  // // theme.colors.modalTextSecondary = "#0f0";
  // // theme.colors.profileAction = "#0f0";
  // // theme.colors.profileActionHover = "#0f0";
  // // theme.colors.profileForeground = "#0f0";
  // // theme.colors.selectedOptionBorder = "#0f0";
  // // theme.colors.standby = "#0f0";

  // theme.colors.modalBackground = 'var(--ls-colors-secondary-900)'

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

  const disclaimer = ({ Text }) => (
    <Text>
      Thanks for choosing Layerswap!
    </Text>
  );

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
      }}
    >
      <IntercomProvider appId={INTERCOM_APP_ID}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider modalSize="compact" chains={chains} theme={theme}
            appInfo={{
              appName: 'Layerswap',
              learnMoreUrl: 'https://docs.layerswap.io/',
              disclaimer: disclaimer
            }}>
            <Component key={router.asPath} {...pageProps} />
          </RainbowKitProvider>
        </WagmiConfig>
      </IntercomProvider>
    </SWRConfig>)
}

export default App