
import '@rainbow-me/rainbowkit/styles.css';
import { useSettingsState } from "../context/settings";
import {
    AvatarComponent,
    connectorsForWallets,
    darkTheme,
    DisclaimerComponent,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { NetworkType } from "../Models/Network";
import resolveChain from "../lib/resolveChain";
import React from "react";
import AddressIcon from "./AddressIcon";
import NetworkSettings from "../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { argentWallet, bitgetWallet, coinbaseWallet, metaMaskWallet, phantomWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig } from 'wagmi';
import { Chain, defineChain, http } from 'viem';
import { arbitrum, arbitrumSepolia, immutableZkEvmTestnet, lineaSepolia, mainnet, optimism, optimismSepolia, sepolia, zoraSepolia, baseSepolia, blastSepolia, zkSyncSepoliaTestnet, taikoTestnetSepolia, scrollSepolia, mantleSepoliaTestnet, taikoHekla, berachainTestnetbArtio } from 'viem/chains';


export const soneium_testnet = defineChain({
    id: 1946,
    name: 'Senoium Testnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://rpc.minato.soneium.org/'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Soneium',
            url: 'https://soneium.org',
            apiUrl: 'https://explorer-testnet.soneium.org/api',
        },
    },
})



type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()
const CustomAvatar: AvatarComponent = ({ address, size }) => {
    return <AddressIcon address={address} size={size} />
};
const disclaimer: DisclaimerComponent = ({ Text }) => (
    <Text>
        Thanks for choosing Layerswap!
    </Text>
);

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                metaMaskWallet,
                walletConnectWallet,
            ],
        },
        {
            groupName: 'Wallets',
            wallets: [
                coinbaseWallet,
                argentWallet,
                bitgetWallet,
                rainbowWallet,
                phantomWallet
            ],
        }
    ],
    {
        appName: 'Layerswap',
        projectId: WALLETCONNECT_PROJECT_ID,
    }
);

const config = createConfig({
    connectors,
    chains: [sepolia, soneium_testnet, mainnet, optimism, optimismSepolia, arbitrumSepolia, arbitrum, lineaSepolia, zoraSepolia, baseSepolia, blastSepolia, zkSyncSepoliaTestnet, taikoTestnetSepolia, scrollSepolia, mantleSepoliaTestnet, taikoHekla, immutableZkEvmTestnet],
    transports: {
        [sepolia.id]: http("https://eth-sepolia.public.blastapi.io"),
        [mainnet.id]: http(),
        [optimism.id]: http(),
        [optimismSepolia.id]: http("https://optimism-sepolia.public.blastapi.io"),
        [arbitrumSepolia.id]: http("https://arbitrum-sepolia.public.blastapi.io"),
        [arbitrum.id]: http("https://arbitrum-sepolia.public.blastapi.io"),
        [lineaSepolia.id]: http("https://linea-sepolia.public.blastapi.io"),
        [zoraSepolia.id]: http(),
        [baseSepolia.id]: http(),
        [blastSepolia.id]: http(),
        [zkSyncSepoliaTestnet.id]: http(),
        [taikoTestnetSepolia.id]: http(),
        [scrollSepolia.id]: http(),
        [mantleSepoliaTestnet.id]: http(),
        [taikoHekla.id]: http(),
        [immutableZkEvmTestnet.id]: http(),
        [soneium_testnet.id]: http(),
        [berachainTestnetbArtio.id]: http(),
    },
    ssr: true,
});

function RainbowKitComponent({ children }: Props) {

    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token)
        .map(resolveChain).filter(isChain) as [Chain]

    const transports = settingsChains.reduce((acc, ch) => (acc[ch.id] = http(), acc), {});

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

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider avatar={CustomAvatar} modalSize="compact" theme={theme}
                    appInfo={{
                        appName: 'Layerswap',
                        learnMoreUrl: 'https://docs.layerswap.io/',
                        disclaimer: disclaimer
                    }}>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default RainbowKitComponent
