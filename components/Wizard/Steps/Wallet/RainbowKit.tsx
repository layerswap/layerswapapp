import '@rainbow-me/rainbowkit/styles.css';
import { FC } from 'react';

import {
    ConnectButton,
    darkTheme,
    getDefaultWallets,
    RainbowKitProvider,

} from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

import "@rainbow-me/rainbowkit/styles.css";

import { mainnet, polygon, optimism, arbitrum, goerli, arbitrumGoerli } from 'wagmi/chains';
import { WalletConnectConnector } from '@wagmi/core/connectors/walletConnect'
 
const { chains, provider } = configureChains(
    [mainnet, polygon, optimism, arbitrum, goerli, arbitrumGoerli],
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
    autoConnect: false,
    connectors,
    provider
})

type Props = {
    chainIds?: number[],
}

const RainbowKit: FC<Props> = ({ chainIds, children }) => {

    const filteredChains = chainIds?.length > 0 ? chains.filter(ch => chainIds.some(id => id === ch.id)) : chains
    const theme = darkTheme({
        accentColor: '#E42575',
        accentColorForeground: 'white',
        borderRadius: 'small',
        fontStack: 'system',
        overlayBlur: 'small',
    })
    theme.colors.modalBackground = '#0e1426'
    return (
        <WagmiConfig client={wagmiClient}>
            <RainbowKitProvider modalSize="compact" chains={filteredChains} theme={theme}>
                <ConnectButton.Custom>
                    {({
                        account,
                        chain,
                        openChainModal,
                        openConnectModal,
                        authenticationStatus,
                        mounted,
                    }) => {
                        // Note: If your app doesn't use authentication, you
                        // can remove all 'authenticationStatus' checks
                        const ready = mounted && authenticationStatus !== 'loading';
                        const connected =
                            ready &&
                            account &&
                            chain &&
                            (!authenticationStatus ||
                                authenticationStatus === 'authenticated');
                        return (
                            <div
                                {...(!ready && {
                                    'aria-hidden': true,
                                    'style': {
                                        opacity: 0,
                                        pointerEvents: 'none',
                                        userSelect: 'none',
                                    },
                                })}
                            >
                                {(() => {
                                    if (!connected) {
                                        return (
                                            <span className='w-full cursor-pointer' onClick={openConnectModal} >
                                                {children}
                                            </span>
                                        );
                                    }

                                    if (chain.unsupported) {
                                        return (
                                            <button onClick={openChainModal} type="button">
                                                Wrong network
                                            </button>
                                        );
                                    }

                                    return (
                                        <></>
                                    );
                                })()}
                            </div>
                        );
                    }}
                </ConnectButton.Custom>
            </RainbowKitProvider>
        </WagmiConfig>
    )
}


const Connect = () => {
    return <ConnectButton />
}

export default RainbowKit;