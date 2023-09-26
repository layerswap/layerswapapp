import "@rainbow-me/rainbowkit/styles.css";
import {
    darkTheme,
    connectorsForWallets,
    RainbowKitProvider
} from '@rainbow-me/rainbowkit';
const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { useSettingsState } from "../context/settings";
import { WagmiConfig, configureChains, createConfig } from "wagmi";
import { NetworkType } from "../Models/CryptoNetwork";
import resolveChain from "../lib/resolveChain";

type Props = {
    children: JSX.Element | JSX.Element[]
}

function RainbowKitComponent({ children }: Props) {
    const settings = useSettingsState();

    const settingsChains = settings.networks.sort((a, b) => Number(a.chain_id) - Number(b.chain_id)).filter(net => net.type === NetworkType.EVM && net.nodes?.some(n => n.url?.length > 0)).map(n => {
        return resolveChain(n)
    })

    const { chains, publicClient } = configureChains(
        settingsChains,
        [publicProvider()]
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

    const theme = darkTheme({
        accentColor: 'rgb(var(--ls-colors-primary-500))',
        accentColorForeground: 'rgb(var(--ls-colors-primary-text))',
        borderRadius: 'small',
        fontStack: 'system',
        overlayBlur: 'small',
    })

    theme.colors.modalBackground = 'rgb(var(--ls-colors-secondary-900))'
    theme.colors.modalText = 'rgb(var(--ls-colors-primary-text))'
    theme.colors.modalTextSecondary = 'rgb(var(--ls-colors-secondary-text))'
    theme.colors.actionButtonBorder = 'rgb(var(--ls-colors-secondary-500))'
    theme.colors.actionButtonBorderMobile = 'rgb(var(--ls-colors-secondary-500))'
    theme.colors.closeButton = 'rgb(var(--ls-colors-secondary-text))'
    theme.colors.closeButtonBackground = 'rgb(var(--ls-colors-secondary-500))'
    theme.colors.generalBorder = 'rgb(var(--ls-colors-secondary-500))'

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
                {children}
            </RainbowKitProvider>
        </WagmiConfig>
    )
}

export default RainbowKitComponent
