
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
import { Chain } from 'viem';
import { mainnet } from 'viem/chains';
import { http } from 'wagmi'

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = '9e6712830dae97aeea66f59a00ec3e1b';

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
        appName: 'Layerswap test',
        appUrl: 'https://gelding-grown-factually.ngrok-free.app/',
        projectId: WALLETCONNECT_PROJECT_ID,
    }
);

function RainbowKitComponent({ children }: Props) {

    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token)
        .map(resolveChain).filter(isChain) as [Chain]

    let chainExceptZkSyncEra = settingsChains.filter(x => x.id != 324) as [Chain];

    const config = createConfig({
        connectors,
        chains: chainExceptZkSyncEra,
        transports:{
            [mainnet.id]: http(),
        }
    });

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
