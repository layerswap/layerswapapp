import "@rainbow-me/rainbowkit/styles.css";
import { configureChains, WagmiConfig, createConfig } from 'wagmi';
import {
    darkTheme,
    connectorsForWallets,
    RainbowKitProvider
} from '@rainbow-me/rainbowkit';
const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { useSettingsState } from "../context/settings";

type Props = {
    children: JSX.Element | JSX.Element[]
}

function RainbowKitComponent({ children }: Props) {
    const settings = useSettingsState();

    const settingsChains = settings.networks.filter(net => net.address_type === 'evm' && net.nodes?.some(n => n.url?.length > 0)).map(n => {
        const nativeCurrency = n.currencies.find(c => c.asset === n.native_currency);
        return {
            id: Number(n.chain_id),
            name: n.display_name,
            network: n.internal_name,
            nativeCurrency: { name: nativeCurrency?.name, symbol: nativeCurrency?.asset, decimals: nativeCurrency?.decimals },
            rpcUrls: {
                default: {
                    http: n.nodes.map(n => n?.url),
                },
                public: {
                    http: n.nodes.map(n => n?.url),
                },
            },
            blockExplorers: {
                default: {
                    name: 'name',
                    url: n.transaction_explorer_template.replace('{0}',''),
                },
            },
            contracts: {
                multicall3: {
                    address: n?.metadata?.contracts?.multicall3?.address,
                    blockCreated: n?.metadata?.contracts?.multicall3?.blockCreated,
                },
            },
        }
    })
   
    const { chains, publicClient } = configureChains(
        settingsChains,
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

    const theme = darkTheme({
        accentColor: 'rgb(var(--colors-primary-500))',
        accentColorForeground: 'white',
        borderRadius: 'small',
        fontStack: 'system',
        overlayBlur: 'small',
    })

    theme.colors.modalBackground = 'rgb(var(--colors-secondary-900))'

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