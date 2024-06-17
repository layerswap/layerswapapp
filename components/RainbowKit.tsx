import "@rainbow-me/rainbowkit/styles.css";
import {
    darkTheme,
    connectorsForWallets,
    RainbowKitProvider,
    DisclaimerComponent,
    AvatarComponent
} from '@rainbow-me/rainbowkit';
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';
import { publicProvider } from 'wagmi/providers/public';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitgetWallet, argentWallet, phantomWallet } from '@rainbow-me/rainbowkit/wallets';
import { useSettingsState } from "../context/settings";
import { Chain, WagmiConfig, configureChains, createConfig, mainnet } from "wagmi";
import { NetworkType } from "../Models/Network";
import resolveChain from "../lib/resolveChain";
import React from "react";
import AddressIcon from "./AddressIcon";
import NetworkSettings from "../lib/NetworkSettings";

type Props = {
    children: JSX.Element | JSX.Element[]
}

function RainbowKitComponent({ children }: Props) {
    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token)
        .map(resolveChain).filter(isChain)

    const { chains, publicClient } = configureChains(
        settingsChains?.length > 0 ? settingsChains : [mainnet],
        [publicProvider()]
    );

    let chainExceptZkSyncEra = chains.filter(x => x.id != 324);
    const projectId = WALLETCONNECT_PROJECT_ID;
    const connectors = connectorsForWallets([
        {
            groupName: 'Popular',
            wallets: [
                metaMaskWallet({ projectId, chains }),
                walletConnectWallet({ projectId, chains, options: { metadata: { url: 'https://layerswap.io', name: "Layerswap app", description: "Streamline your asset transaction experience with Layerswap across 35+ blockchains", icons: ["https://layerswap.io/app/favicon/apple-touch-icon.png"] }, projectId } }),
            ],
        },
        {
            groupName: 'Wallets',
            wallets: [
                coinbaseWallet({ chains, appName: 'Layerswap' }),
                argentWallet({ projectId, chains: chainExceptZkSyncEra }),
                bitgetWallet({ projectId, chains }),
                rainbowWallet({ projectId, chains }),
                phantomWallet({ chains })
            ],
        }
    ])

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

    const disclaimer: DisclaimerComponent = ({ Text }) => (
        <Text>
            Thanks for choosing Layerswap!
        </Text>
    );

    const CustomAvatar: AvatarComponent = ({ address, size }) => {
        return <AddressIcon address={address} size={size} />
    };

    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider avatar={CustomAvatar} modalSize="compact" chains={chains} theme={theme}
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
