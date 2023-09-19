import type { Meta, StoryObj } from '@storybook/react';
import { SwapItem, TransactionStatus, TransactionType } from '../lib/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapDataStateContext, SwapDataUpdateContext } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { WalletStateContext } from '../context/wallet';
import { QueryStateContext } from '../context/query';
import { FC, useEffect, useState } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { swap, failedSwap, failedSwapOutOfRange, cancelled, expired } from './Data/swaps'
import { Settings } from './Data/settings';
import { NetworkType } from '../Models/CryptoNetwork';
import SwapDetails from '../components/Swap';
import { AuthDataUpdateContext, AuthStateContext } from '../context/authContext';
import { IntercomProvider } from 'react-use-intercom';
import RainbowKitComponent from '../components/RainbowKit';
import Layout from '../components/layout';
import ColorSchema from '../components/ColorSchema';
import { THEME_COLORS } from '../Models/Theme';
const INTERCOM_APP_ID = 'h5zisg78'
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
            coinbaseWallet({ chains, appName: 'Layerswap' }),
            argentWallet({ projectId, chains }),
            bitKeepWallet({ projectId, chains }),
            rainbowWallet({ projectId, chains }),
        ],
    },
]);
window.plausible = () => { }
const Comp: FC<{ swap: SwapItem, failedSwap?: SwapItem, failedSwapOutOfRange?: SwapItem, theme?: "default" | "light" }> = ({ swap, failedSwap, failedSwapOutOfRange, theme }) => {
    const [appSettings, setAppSettings] = useState(null);
    const wagmiConfig = createConfig({
        autoConnect: true,
        connectors,
        publicClient,
    })
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await (await fetch(`https://bridge-api-dev.layerswap.cloud/api/settings?version=sandbox`)).json();
                let appSettings = new LayerSwapAppSettings(res.data)
                setAppSettings(appSettings);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchData();
    }, []);
    const swapContextInitialValues = { codeRequested: false, swap, failedSwap, failedSwapOutOfRange, addressConfirmed: false, walletAddress: "", depositeAddressIsfromAccount: false, withdrawType: undefined, swapTransaction: undefined, selectedAssetNetwork: undefined }

    if (!appSettings) {
        return <div>Loading...</div>
    }
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS["default"];
    return <IntercomProvider appId={INTERCOM_APP_ID}>
        <SettingsStateContext.Provider value={appSettings}>
            <Layout settings={appSettings}>
                <RainbowKitComponent>
                    <QueryStateContext.Provider value={{}}>
                        <AuthStateContext.Provider value={{}}>
                            <AuthDataUpdateContext.Provider value={{}}>
                                <SwapDataStateContext.Provider value={swapContextInitialValues}>
                                    <SwapDataUpdateContext.Provider value={{ setInterval: () => { } }}>
                                        <WalletStateContext.Provider value={{ balances: null, gases: null, imxAccount: null, isBalanceLoading: null, isGasLoading: null, starknetAccount: null }}>
                                            <SwapDetails />
                                        </WalletStateContext.Provider>
                                    </SwapDataUpdateContext.Provider>
                                </SwapDataStateContext.Provider>
                            </AuthDataUpdateContext.Provider>
                        </AuthStateContext.Provider>
                    </QueryStateContext.Provider>
                </RainbowKitComponent>
                <ColorSchema themeData={themeData} />
            </Layout>
        </SettingsStateContext.Provider>
    </IntercomProvider>
}

const DUMMY_TRANSACTION = {
    account_explorer_url: "",
    from: "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
    to: "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
    created_date: "2023-08-16T16:33:23.4937+00:00",
    transaction_id: "0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
    explorer_url: "https://goerli.arbiscan.io/tx/0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
    confirmations: 28,
    max_confirmations: 12,
    amount: 0.00093,
    usd_price: 1819.02,
    type: TransactionType,
    usd_value: 1.6916886,
    status: TransactionStatus,
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
          options: ['light', 'default'],
          control: { type: 'select' },
        },
      },
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserTransferInitiated: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.UserTransferPending,
            transactions: [
            ]
        },
    },
    loaders: [
        async () => ({
            A: window.localStorage.setItem("swapTransactions", `{"${swap.id}": {"hash": "0xe1d8539c6dbe522560c41d645f10ffc3f50b8f689a4ce4774573576cb845d5fc", "status":2}}`)
        }),
    ]
};

export const UserTransferDetected: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.UserTransferPending,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Initiated, type: TransactionType.Input, confirmations: 2, max_confirmations: 3 },
            ]
        }
    }
};


export const UserTransferPendingInputCompleted: Story = {
    args: {
        swap: {
            ...failedSwap,
            status: SwapStatus.UserTransferPending,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
            ]
        }
    }
};

export const LsTransferPending: Story = {
    args: {
        swap: {
            ...failedSwap,
            status: SwapStatus.LsTransferPending,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Pending, type: TransactionType.Output },
            ]
        }
    }
};

export const LsTransferPendingWithRefuel: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.LsTransferPending,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Pending, type: TransactionType.Output },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Pending, type: TransactionType.Refuel },
            ]
        }
    }
};

export const LsTransferInitiated: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.LsTransferPending,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Initiated, type: TransactionType.Output, confirmations: 2, max_confirmations: 5 },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Initiated, type: TransactionType.Refuel, confirmations: 1, max_confirmations: 5 },
            ]
        }
    }
};

export const Completed: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.Completed,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Output },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Refuel },
            ]
        }
    }
};

export const OnlyRefuelCompleted: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.Completed,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Pending, type: TransactionType.Output },
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Refuel },
            ]
        }
    }
};


export const UserTransferDelayed: Story = {
    args: {
        swap: {
            ...swap,
            status: SwapStatus.UserTransferDelayed,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Pending, type: TransactionType.Input },
            ]
        }
    }
};

export const Failed: Story = {
    args: {
        swap: {
            ...failedSwap,
            status: SwapStatus.Failed,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
            ]
        }
    }
};

export const FailedOutOfRangeAmount: Story = {
    args: {
        swap: {
            ...failedSwapOutOfRange,
            status: SwapStatus.Failed,
            transactions: [
                { ...DUMMY_TRANSACTION, status: TransactionStatus.Completed, type: TransactionType.Input },
            ]
        }
    }
};

export const Cancelled: Story = {
    args: {
        swap: {
            ...cancelled,
            status: SwapStatus.Cancelled,
            transactions: [
            ]
        }
    }
};

export const Expired: Story = {
    args: {
        swap: {
            ...expired,
            status: SwapStatus.Expired,
            transactions: [
            ]
        }
    }
};