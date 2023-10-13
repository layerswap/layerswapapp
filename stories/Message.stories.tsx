import type { Meta, StoryObj } from '@storybook/react';
import { SwapItem } from '../lib/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapData, SwapDataStateContext, SwapDataUpdateContext } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { WalletStateContext } from '../context/wallet';
import { QueryStateContext } from '../context/query';
import { FC } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { swap } from './Data/swaps'
import { Settings } from './Data/settings';
import { NetworkType } from '../Models/CryptoNetwork';
import { AuthDataUpdateContext, AuthStateContext, UserType } from '../context/authContext';
import { IntercomProvider } from 'react-use-intercom';
import ColorSchema from '../components/ColorSchema';
import { THEME_COLORS } from '../Models/Theme';
import Layout from '../components/layout';
import RainbowKitComponent from '../components/RainbowKit';
import SwapDetails from '../components/Swap';
import WalletMessage from '../components/Swap/Withdraw/Wallet/WalletTransfer/message';

const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
let settings = new LayerSwapAppSettings(Settings)

const settingsChains = settings.networks.filter(net => net.type === NetworkType.EVM && net.nodes?.some(n => n.url?.length > 0)).map(n => {
    const nativeCurrency = n.currencies.find(c => c.asset === n.native_currency);
    const blockExplorersBaseURL = new URL(n.transaction_explorer_template).origin;
    return {
        id: Number(n.chain_id),
        name: n.display_name,
        network: n.internal_name,
        nativeCurrency: { name: nativeCurrency?.name, symbol: nativeCurrency?.asset, decimals: nativeCurrency?.decimals },
        rpcUrls: {
            default: {
                http: n.nodes.map(n => n?.url),
            },
            public: {
                http: n.nodes.map(n => n?.url),
            },
        },
        blockExplorers: {
            default: {
                name: 'name',
                url: blockExplorersBaseURL,
            },
        },
        contracts: {
            multicall3: n?.metadata?.multicall3
        },
    }
})

const { chains, publicClient } = configureChains(
    settingsChains,
    [
        publicProvider()
    ]
);

const projectId = WALLETCONNECT_PROJECT_ID;
const connectors = connectorsForWallets([
    {
        groupName: 'Popular',
        wallets: [
            metaMaskWallet({ projectId, chains }),
            walletConnectWallet({ projectId, chains }),
        ],
    },
    {
        groupName: 'Wallets',
        wallets: [
            argentWallet({ projectId, chains }),
            bitKeepWallet({ projectId, chains }),
            rainbowWallet({ projectId, chains }),
        ],
    },
]);
window.plausible = () => { }
const Comp: FC<{ settings: any, swap: SwapItem, failedSwap?: SwapItem, failedSwapOutOfRange?: SwapItem, theme?: "default" | "light" }> = ({ settings, swap, failedSwap, failedSwapOutOfRange, theme }) => {
    const wagmiConfig = createConfig({
        autoConnect: true,
        connectors,
        publicClient,
    })
    const appSettings = new LayerSwapAppSettings(settings?.data)
    const swapContextInitialValues: SwapData = { codeRequested: false, swap, addressConfirmed: false, depositeAddressIsfromAccount: false, withdrawType: undefined, swapTransaction: undefined, selectedAssetNetwork: undefined }
    if (!appSettings) {
        return <div>Loading...</div>
    }
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS["default"];
    return <WagmiConfig config={wagmiConfig}>
        <IntercomProvider appId='123'>
            <SettingsStateContext.Provider value={appSettings}>
                <Layout settings={appSettings}>
                    <RainbowKitComponent>
                        <QueryStateContext.Provider value={{}}>
                            <SwapDataStateContext.Provider value={swapContextInitialValues}>
                                <AuthStateContext.Provider value={{ authData: undefined, email: "asd@gmail.com", codeRequested: false, guestAuthData: undefined, tempEmail: undefined, userId: "1", userLockedOut: false, userType: UserType.AuthenticatedUser }}>
                                    <AuthDataUpdateContext.Provider value={{}}>
                                        <SwapDataUpdateContext.Provider value={{ setInterval: () => { } }}>
                                            <WalletStateContext.Provider value={{ balances: null, gases: null, imxAccount: null, isBalanceLoading: null, isGasLoading: null, starknetAccount: null, syncWallet: null }}>
                                                <WalletMessage status="pending"
                                                    header='Preparing the transaction'
                                                    details='Will be ready to sign in a couple of seconds' />
                                            </WalletStateContext.Provider>
                                        </SwapDataUpdateContext.Provider>
                                    </AuthDataUpdateContext.Provider>
                                </AuthStateContext.Provider>
                            </SwapDataStateContext.Provider >
                        </QueryStateContext.Provider>
                    </RainbowKitComponent>
                    <ColorSchema themeData={themeData} />
                </Layout>
            </SettingsStateContext.Provider>
        </IntercomProvider>
    </WagmiConfig >
}

const meta = {
    title: 'Example/Process',
    component: Comp,
    parameters: {
        layout: 'centered',
    },
    args: {
        theme: 'default',
    },
    argTypes: {
        theme: {
            options: ['light', 'default', 'evmos', 'imxMarketplace', 'ea7df14a1597407f9f755f05e25bab42'],
            control: { type: 'select' },
        },
    },
    render: (args, { loaded: { settings } }) => <Comp {...args} settings={settings} />,
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserTransferDetected1: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.UserTransferPending,
            transactions: [
            ]
        }
    }
};
