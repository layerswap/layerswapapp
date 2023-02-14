import '@rainbow-me/rainbowkit/styles.css';
import { FC } from 'react';

import {
    ConnectButton,
    getDefaultWallets,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { Chain, configureChains, createClient, WagmiConfig } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';
import NetworkSettings from '../../../../lib/NetworkSettings';
import { SwapItem } from '../../../../lib/layerSwapApiClient';
import { CryptoNetwork } from '../../../../Models/CryptoNetwork';
import { mainnet, polygon, optimism, arbitrum } from 'wagmi/chains';



const RainbowKit: FC= () => {
    console.log("blah blah")

    const { chains, provider } = configureChains(
        [mainnet, polygon, optimism, arbitrum],
        [
            alchemyProvider({ apiKey: process.env.NEXT_PUBLIC_ALCHEMY_ID }),
            publicProvider()
        ]
    );

    const { connectors } = getDefaultWallets({
        appName: 'My RainbowKit App',
        chains
    });

    const wagmiClient = createClient({
        autoConnect: true,
        connectors,
        provider
    })


    return (
        <WagmiConfig client={wagmiClient}>
            <RainbowKitProvider chains={chains}>
                <Connect />
            </RainbowKitProvider>
        </WagmiConfig>
    )
}


const Connect = () => {
    return <ConnectButton />
}

export default RainbowKit;