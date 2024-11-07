

import '@rainbow-me/rainbowkit/styles.css';
import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { WalletModalProvider } from '../WalletModal';
import Solana from "./SolanaProvider";
import { my_argent } from '../../lib/wallets/connectors/argent';
import { my_rainbow } from '../../lib/wallets/connectors/rainbow';
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors'
import { hasInjectedProvider } from '../../lib/wallets/connectors/getInjectedConnector';
import { my_bitget } from '../../lib/wallets/connectors/bitget';
import { isMobile } from '../../lib/isMobile';
import FuelProviderWrapper from './FuelProvider';

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chain_id)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chain_id)))
        .filter(net => net.type === NetworkType.EVM
            && net.node_url
            && net.token)
        .map(resolveChain).filter(isChain) as Chain[]

    const transports = {}

    settingsChains.forEach(chain => {
        transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
    })
    const isMetaMaskInjected = hasInjectedProvider({ flag: 'isMetaMask' });
    const isRainbowInjected = hasInjectedProvider({ flag: 'isRainbow' });
    const isBitKeepInjected = hasInjectedProvider({
        namespace: 'bitkeep.ethereum',
        flag: 'isBitKeep',
    });

    const config = createConfig({
        connectors: [
            coinbaseWallet(),
            walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' }),
            my_argent({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'argent' }),
            ...(!isMetaMaskInjected ? [metaMask()] : []),
            ...(!isRainbowInjected ? [my_rainbow({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'rainbow' })] : []),
            ...(!isBitKeepInjected ? [my_bitget({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'bitget' })] : [])
        ],
        chains: settingsChains as [Chain, ...Chain[]],
        transports: transports,
    });
    return (
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                <Solana>
                    <FuelProviderWrapper>
                        <WalletModalProvider>
                            {children}
                        </WalletModalProvider>
                    </FuelProviderWrapper>
                </Solana>
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent

