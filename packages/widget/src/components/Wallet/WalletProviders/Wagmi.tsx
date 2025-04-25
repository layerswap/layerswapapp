

import { useSettingsState } from "../../../context/settings";
import { NetworkType } from "../../../Models/Network";
import resolveChain from "../../../lib/resolveChain";
import NetworkSettings from "../../../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { WalletModalProvider } from '../WalletModal';
import { argent } from '../../../lib/wallets/connectors/argent';
import { rainbow } from '../../../lib/wallets/connectors/rainbow';
import { metaMask } from '../../../lib/wallets/connectors/metamask';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { hasInjectedProvider } from '../../../lib/wallets/connectors/getInjectedConnector';
import { bitget } from '../../../lib/wallets/connectors/bitget';
import { isMobile } from '../../../lib/isMobile';
import FuelProviderWrapper from "./FuelProvider";
import { browserInjected } from "../../../lib/wallets/connectors/browserInjected";
import { useSyncProviders } from "../../../lib/wallets/connectors/useSyncProviders";
import { okxWallet } from "../../../lib/wallets/connectors/okxWallet";
import AppSettings from "../../../lib/AppSettings";
import {
    DynamicContextProvider,
} from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_CONFIGS = AppSettings.WalletConnectConfig

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
    const providers = useSyncProviders();

    settingsChains.forEach(chain => {
        transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
    })

    const isMetaMaskInjected = providers?.some(provider => provider.info.name.toLowerCase() === 'metamask');
    const isOkxInjected = providers?.some(provider => provider.info.name.toLowerCase() === 'okx wallet');
    const isRainbowInjected = hasInjectedProvider({ flag: 'isRainbow' });
    const isBitKeepInjected = hasInjectedProvider({
        namespace: 'bitkeep.ethereum',
        flag: 'isBitKeep',
    });

    const config = createConfig({
        connectors: [
            coinbaseWallet({
                appName: WALLETCONNECT_PROJECT_CONFIGS.name,
                appLogoUrl: WALLETCONNECT_PROJECT_CONFIGS.icons[0],
            }),
            walletConnect({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' }),
            argent({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: false, customStoragePrefix: 'argent' }),
            ...(!isMetaMaskInjected ? [metaMask({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: false, customStoragePrefix: 'metamask', providers })] : []),
            ...(!isRainbowInjected ? [rainbow({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: false, customStoragePrefix: 'rainbow' })] : []),
            ...(!isBitKeepInjected ? [bitget({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: false, customStoragePrefix: 'bitget' })] : []),
            ...(!isOkxInjected ? [okxWallet({ projectId: WALLETCONNECT_PROJECT_CONFIGS.projectId, showQrModal: false, customStoragePrefix: 'okxWallet', providers })] : []),
            browserInjected()
        ],
        chains: settingsChains as [Chain, ...Chain[]],
        transports: transports,
    });

    return (
        <DynamicContextProvider
            settings={{
                // Find your environment id at https://app.dynamic.xyz/dashboard/developer
                environmentId: "2762a57b-faa4-41ce-9f16-abff9300e2c9",
                walletConnectors: [EthereumWalletConnectors],
                overrides: {
                    evmNetworks: config.chains
                        ? convertToDynamicNetworks(config.chains)
                        : undefined,
                }
            }}
        >
            <WagmiProvider config={config} >
                <QueryClientProvider client={queryClient}>
                    <DynamicWagmiConnector>
                        <FuelProviderWrapper>
                            <WalletModalProvider>
                                {children}
                            </WalletModalProvider>
                        </FuelProviderWrapper>
                    </DynamicWagmiConnector>
                </QueryClientProvider>
            </WagmiProvider >
        </DynamicContextProvider>
    )
}

const convertToDynamicNetworks = (chains: Chain[]) =>
    chains.map((chain) => ({
        id: chain.id,
        blockExplorerUrls: [chain.blockExplorers?.default.url!],
        chainId: chain.id,
        chainName: chain.name,
        iconUrls: [''],
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        networkId: chain.id,
        rpcUrls: [chain.rpcUrls.default.http as unknown as string],
        vanityName: chain.name,
    }))

export default WagmiComponent