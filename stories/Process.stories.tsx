import type { Meta, StoryObj } from '@storybook/react';
import Processing from '../components/Swap/Withdraw/Processing';
import { SwapItem, TransactionStatus, TransactionType } from '../lib/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapDataStateContext } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { WagmiConfig, configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import { walletConnectWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, bitKeepWallet, argentWallet } from '@rainbow-me/rainbowkit/wallets';
import { WalletStateContext } from '../context/wallet';
import { QueryStateContext } from '../context/query';
import { FC, useEffect, useState } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { swap, failedSwap, failedSwapOutOfRange, cancelled, expired } from './Data/swaps'
import { Settings } from './Data/settings';
import Success from '../components/Swap/Withdraw/Success';
import Delay from '../components/Swap/Withdraw/Delay';
import Widget from '../components/Wizard/Widget';
import MessageComponent from '../components/MessageComponent';
import SubmitButton, { DoubleLineText } from '../components/buttons/submitButton';
import { Home, MessageSquare } from 'lucide-react';
import GoHomeButton from '../components/utils/GoHome';
import SwapSummary from '../components/Swap/Summary';
import Cancell from '../components/icons/Cancell';

const WALLETCONNECT_PROJECT_ID = '28168903b2d30c75e5f7f2d71902581b';
let settings = new LayerSwapAppSettings(Settings)

const settingsChains = settings.networks.filter(net => net.address_type === 'evm' && net.nodes?.some(n => n.url?.length > 0)).map(n => {
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
            multicall3: n?.metadata?.contracts?.multicall3
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

const Comp: FC<{ swap: SwapItem, failedSwap?: SwapItem, failedSwapOutOfRange?: SwapItem, }> = ({ swap, failedSwap, failedSwapOutOfRange }) => {
    const [appSettings, setAppSettings] = useState(null);
    const swapStatus = swap.status;
    const swapInputTransaction = swap?.transactions?.find(t => t.type === TransactionType.Input) ? swap?.transactions?.find(t => t.type === TransactionType.Input) : JSON.parse(localStorage.getItem("swapTransactions"))?.[swap?.id]
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

    return <WagmiConfig config={wagmiConfig}>
        <SettingsStateContext.Provider value={appSettings}>
            <QueryStateContext.Provider value={{}}>
                <SwapDataStateContext.Provider value={swapContextInitialValues}>
                    <WalletStateContext.Provider value={{}}>
                        <div className={`flex content-center items-center justify-center space-y-5 flex-col container mx-auto sm:px-6 max-w-lg`}>
                            <div className={`flex flex-col w-full text-white`}>
                                <div className={`bg-secondary-900 md:shadow-card rounded-lg w-full sm:overflow-hidden relative`}>
                                    <div className="relative px-6 py-4">
                                        {
                                            (swapInputTransaction
                                                || swapStatus === SwapStatus.LsTransferPending)
                                            &&
                                            <Processing />
                                        }
                                        {
                                            swapStatus === SwapStatus.Completed &&
                                            <Success />
                                        }
                                        {
                                            swapStatus === SwapStatus.Failed &&
                                            <Widget.Content>
                                                <MessageComponent.Buttons>
                                                    <div className="flex text-white text-base space-x-2">
                                                        <div className='basis-1/3 grow'>
                                                            <SubmitButton text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='filled' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                                                                <DoubleLineText
                                                                    colorStyle='mltln-text-light'
                                                                    primaryText='Contact Support'
                                                                    secondarytext=''
                                                                />
                                                            </SubmitButton>
                                                        </div>
                                                    </div>
                                                </MessageComponent.Buttons>
                                            </Widget.Content>
                                        }
                                        {
                                            swapStatus === SwapStatus.UserTransferDelayed &&
                                            <Delay />
                                        }
                                        {
                                            swap?.status == SwapStatus.Cancelled &&
                                            <Widget.Content>
                                                <SwapSummary />
                                                <MessageComponent>
                                                    <MessageComponent.Description>
                                                        {
                                                            <>
                                                                <div className='p-3 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                                                                    <div className="flex items-center">
                                                                        <Cancell />
                                                                        <label className="block text-sm md:text-base font-medium">Swap cancelled</label>
                                                                    </div>
                                                                    <div className='mt-4 ml-1 text-xs md:text-sm text-white'>
                                                                        <p className='text-md text-left'>The transaction was cancelled by your request. If you have already sent funds, please contact support.</p>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        }
                                                    </MessageComponent.Description>
                                                    <MessageComponent.Buttons>
                                                        <div className="flex flex-row text-white text-base space-x-2 mt-2">
                                                            <div className='basis-1/3'>
                                                                <SubmitButton text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                                                                    <DoubleLineText
                                                                        colorStyle='mltln-text-dark'
                                                                        primaryText='Support'
                                                                        secondarytext='Contact'
                                                                    />
                                                                </SubmitButton>
                                                            </div>
                                                            <div className='basis-2/3'>
                                                                <GoHomeButton>
                                                                    <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                                                        <DoubleLineText
                                                                            colorStyle='mltln-text-dark'
                                                                            primaryText='Swap'
                                                                            secondarytext='Do another'
                                                                        />
                                                                    </SubmitButton>
                                                                </GoHomeButton>
                                                            </div>
                                                        </div>
                                                    </MessageComponent.Buttons>
                                                </MessageComponent>
                                            </Widget.Content>
                                        }
                                        {
                                            swap?.status == SwapStatus.Expired &&
                                            <Widget.Content>
                                                <SwapSummary />
                                                <MessageComponent>
                                                    <MessageComponent.Description>
                                                        {
                                                            <>
                                                                <div className='p-3 bg-secondary-700 text-white rounded-lg border border-secondary-500'>
                                                                    <div className="flex items-center">
                                                                        <Cancell />
                                                                        <label className="block text-sm md:text-base font-medium">Swap expired</label>
                                                                    </div>
                                                                    <div className='mt-4 ml-1 text-xs md:text-sm text-white'>
                                                                        <p className='text-md text-left'>The transfer wasn’t completed during the allocated timeframe.</p>
                                                                        <ul className="list-inside font-light space-y-1 mt-2 text-left ">
                                                                            <li>If you’ve already sent crypto for this swap, your funds are safe, please contact our support.</li>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            </>
                                                        }
                                                    </MessageComponent.Description>
                                                    <MessageComponent.Buttons>
                                                        <div className="flex flex-row text-white text-base space-x-2 mt-2">
                                                            <div className='basis-1/3'>
                                                                <SubmitButton text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}>
                                                                    <DoubleLineText
                                                                        colorStyle='mltln-text-dark'
                                                                        primaryText='Support'
                                                                        secondarytext='Contact'
                                                                    />
                                                                </SubmitButton>
                                                            </div>
                                                            <div className='basis-2/3'>
                                                                <GoHomeButton>
                                                                    <SubmitButton button_align='right' text_align='left' isDisabled={false} isSubmitting={false} buttonStyle='outline' icon={<Home className="h-5 w-5" aria-hidden="true" />}>
                                                                        <DoubleLineText
                                                                            colorStyle='mltln-text-dark'
                                                                            primaryText='Swap'
                                                                            secondarytext='Do another'
                                                                        />
                                                                    </SubmitButton>
                                                                </GoHomeButton>
                                                            </div>
                                                        </div>
                                                    </MessageComponent.Buttons>
                                                </MessageComponent>
                                            </Widget.Content>
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </WalletStateContext.Provider>
                </SwapDataStateContext.Provider >
            </QueryStateContext.Provider>
        </SettingsStateContext.Provider>
    </WagmiConfig>
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
    }
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