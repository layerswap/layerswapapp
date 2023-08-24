import type { Meta, StoryObj } from '@storybook/react';
import { SwapItem, TransactionType } from '../lib/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapDataStateContext } from '../context/swap';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { Settings } from './Data/settings';
import { SettingsStateContext } from '../context/settings';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { supportedChains } from '../lib/chainConfigs';
import { publicProvider } from 'wagmi/providers/public';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { WalletStateContext } from '../context/wallet';
import { QueryStateContext } from '../context/query';
import { FC } from 'react';
import FailedStory from './storyComponents/Failed';

const swap: SwapItem = {
    "id": "2f3f3d0f-028a-49ed-a648-bb3543061a80",
    "sequence_number": 2308,
    "requested_amount": 0.0015,
    "fee": 0.00057,
    "message": null,
    "reference_id": null,
    "app_name": "Layerswap",
    "has_pending_deposit": false,
    "created_date": "2023-08-16T16:31:11.934618+00:00",
    "status": SwapStatus.Failed,
    "destination_address": "0x142c03fC8fd30d11Ed17eF0F48a9941fD4A66953",
    "source_network_asset": "ETH",
    "source_network": "ETHEREUM_GOERLI",
    "source_exchange": null,
    "destination_network_asset": "ETH",
    "destination_network": "ARBITRUM_GOERLI",
    "destination_exchange": null,
    "has_refuel": true,
    "transactions": [
        {
            "from": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "to": "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
            "created_date": "2023-08-16T16:31:50.028165+00:00",
            "transaction_id": "0x40eb981625e69775664049fb930d489ff766a906c0528ffdb32715636d145962",
            "explorer_url": "https://goerli.etherscan.io/tx/0x40eb981625e69775664049fb930d489ff766a906c0528ffdb32715636d145962",
            "confirmations": 3,
            "max_confirmations": 3,
            "amount": 0.0015,
            "usd_price": 1819.02,
            "type": TransactionType.Input,
            "usd_value": 2.728530,
            "account_explorer_url": ''
        },
        {
            "account_explorer_url": '',
            "from": "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
            "to": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "created_date": "2023-08-16T16:33:23.4937+00:00",
            "transaction_id": "0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
            "explorer_url": "https://goerli.arbiscan.io/tx/0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
            "confirmations": 28,
            "max_confirmations": 12,
            "amount": 0.00093,
            "usd_price": 1819.02,
            "type": TransactionType.Output,
            "usd_value": 1.6916886
        },
        {
            "amount": 0.000271,
            "confirmations": 15,
            "created_date": "2023-08-15T15:38:46.036437+00:00",
            "explorer_url": "https://goerli.arbiscan.io/tx/0x673d993640252bc40e7f69291a341deea2bb5250e8b13531b9e1412e326c5c42",
            "from": "0xe66aa98b55c5a55c9af9da12fe39b8868af9a346",
            "max_confirmations": 12,
            "to": "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
            "transaction_id": "0x673d993640252bc40e7f69291a341deea2bb5250e8b13531b9e1412e326c5c42",
            "type": TransactionType.Refuel,
            "usd_price": 1840.02,
            "usd_value": 0.49864542,
            "account_explorer_url": ''
        }
    ]
}
const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';

const { chains, publicClient } = configureChains(
    supportedChains,
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
            coinbaseWallet({ chains, appName: 'Layerswap' }),
            argentWallet({ projectId, chains }),
            bitKeepWallet({ projectId, chains }),
            rainbowWallet({ projectId, chains }),
        ],
    },
]);

let appSettings = new LayerSwapAppSettings(Settings)

const Comp1: FC<{ swap: SwapItem }> = ({ swap }) => {
    const wagmiConfig = createConfig({
        autoConnect: true,
        connectors,
        publicClient,
    })
    const swapContextInitialValues = { codeRequested: false, swap, addressConfirmed: false, walletAddress: "", depositeAddressIsfromAccount: false, withdrawType: undefined, swapTransaction: undefined, selectedAssetNetwork: undefined }
    return <WagmiConfig config={wagmiConfig}>
        <SettingsStateContext.Provider value={appSettings}>
            <QueryStateContext.Provider value={{}}>
                <SwapDataStateContext.Provider value={swapContextInitialValues}>
                    <WalletStateContext.Provider value={{}}>
                        <FailedStory />
                    </WalletStateContext.Provider>
                </SwapDataStateContext.Provider >
            </QueryStateContext.Provider>
        </SettingsStateContext.Provider>
    </WagmiConfig>
}
// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta = {
    title: 'Example/Failed',
    component: Comp1,
    parameters: {
        layout: 'centered',
    }
} satisfies Meta<typeof Comp1>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args
export const Initial: Story = {
    args: {
        swap: { ...swap, status: SwapStatus.Failed }
    }
};