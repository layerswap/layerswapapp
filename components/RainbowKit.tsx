import { useRouter } from "next/router";
import "@rainbow-me/rainbowkit/styles.css";
import { configureChains, WagmiConfig, createConfig } from 'wagmi';
import {
    darkTheme,
    connectorsForWallets,
    RainbowKitProvider
} from '@rainbow-me/rainbowkit';
const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
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

function RainbowKitComponent({ Component, pageProps }) {
    const theme = darkTheme({
        accentColor: 'rgb(var(--colors-primary-500))',
        accentColorForeground: 'white',
        borderRadius: 'small',
        fontStack: 'system',
        overlayBlur: 'small',
    })

    theme.colors.modalBackground = 'rgb(var(--colors-secondary-900))'

    const router = useRouter()

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
    )
}

export default RainbowKitComponent