
import { useSettingsState } from "../context/settings";
import { NetworkType } from "../Models/Network";
import resolveChain from "../lib/resolveChain";
import React from "react";
import NetworkSettings from "../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { WalletModalProvider } from './WalletModal';
import Solana from "./SolanaProvider";
import { argentWallet, bitgetWallet, coinbaseWallet, injectedWallet, metaMaskWallet, phantomWallet, rainbowWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets'
import { connectorsForWallets } from '@rainbow-me/rainbowkit';


type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()

export const connectors = connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                injectedWallet,
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

function WagmiComponent({ children }: Props) {

    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token)
        .map(resolveChain).filter(isChain) as unknown as readonly [Chain, ...Chain[]]

    const transports = {}

    settingsChains.forEach(chain => {
        transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
    })

    const config = createConfig({
        connectors: connectors,
        chains: settingsChains,
        transports: transports,
    });

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <Solana>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </Solana>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default WagmiComponent