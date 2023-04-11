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

import { mainnet, polygon, optimism, arbitrum, goerli, arbitrumGoerli, aurora, auroraTestnet, avalanche, avalancheFuji, baseGoerli, boba, bronos, bronosTestnet, bsc, bscTestnet, canto, celo, celoAlfajores, crossbell, evmos, evmosTestnet, fantom, fantomTestnet, filecoin, filecoinCalibration, filecoinHyperspace, flare, flareTestnet, foundry, gnosis, gnosisChiado, hardhat, harmonyOne, iotex, iotexTestnet, localhost, metis, metisGoerli, moonbaseAlpha, moonbeam, moonriver, okc, optimismGoerli, polygonMumbai, polygonZkEvmTestnet, sepolia, shardeumSphinx, songbird, songbirdTestnet, taraxa, taraxaTestnet, telos, telosTestnet, zhejiang, zkSync, zkSyncTestnet } from 'wagmi/chains';


const { chains, provider } = configureChains(
    [arbitrum, arbitrumGoerli, aurora, auroraTestnet, avalanche, avalancheFuji, baseGoerli, boba, bronos, bronosTestnet, bsc, bscTestnet, canto, celo, celoAlfajores, crossbell, evmos, evmosTestnet, fantom, fantomTestnet, filecoin, filecoinCalibration, filecoinHyperspace, flare, flareTestnet, foundry, gnosis, gnosisChiado, goerli, hardhat, harmonyOne, iotex, iotexTestnet, localhost, mainnet, metis, metisGoerli, moonbaseAlpha, moonbeam, moonriver, okc, optimism, optimismGoerli, polygon, polygonMumbai, polygonZkEvmTestnet, sepolia, shardeumSphinx, songbird, songbirdTestnet, taraxa, taraxaTestnet, telos, telosTestnet, zhejiang, zkSync, zkSyncTestnet],
    [
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