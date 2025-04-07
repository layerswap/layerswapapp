

import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React, { useMemo } from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { WalletModalProvider } from '../WalletModal';
import { argent } from '../../lib/wallets/connectors/argent';
import { rainbow } from '../../lib/wallets/connectors/rainbow';
import { metaMask } from '../../lib/wallets/connectors/metamask';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { hasInjectedProvider } from '../../lib/wallets/connectors/getInjectedConnector';
import { bitget } from '../../lib/wallets/connectors/bitget';
import { isMobile } from '../../lib/isMobile';
import FuelProviderWrapper from "./FuelProvider";
import { browserInjected } from "../../lib/wallets/connectors/browserInjected";

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()
const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })

const argent_inited = argent({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'argent' })
const metaMask_inited = metaMask({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'metamask' })
const rnbw_inited = rainbow({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'rainbow' })
const btgt_inited = bitget({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'bitget' })

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined

    const isMetaMaskInjected = hasInjectedProvider({ flag: 'isMetaMask' });
    const isRainbowInjected = hasInjectedProvider({ flag: 'isRainbow' });
    const isBitKeepInjected = hasInjectedProvider({
        namespace: 'bitkeep.ethereum',
        flag: 'isBitKeep',
    });

    const config = useMemo(() => {
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

        return createConfig({
            connectors: [
                coinbaseWallet({
                    appName: 'Layerswap',
                    appLogoUrl: 'https://layerswap.io/app/symbol.png',
                }),
                wltcnnct_inited,
                argent_inited,
                ...(!isMetaMaskInjected ? [metaMask_inited] : []),
                ...(!isRainbowInjected ? [rnbw_inited] : []),
                ...(!isBitKeepInjected ? [btgt_inited] : []),
                browserInjected()
            ],
            chains: settingsChains as [Chain, ...Chain[]],
            transports: transports,
        })
    }, [settings?.networks]);

    return (
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                <FuelProviderWrapper>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </FuelProviderWrapper>
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent