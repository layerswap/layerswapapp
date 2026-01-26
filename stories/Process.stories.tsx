import type { Meta, StoryObj } from '@storybook/nextjs';
import { SwapItem, BackendTransactionStatus, TransactionType, SwapResponse } from '../lib/apiClients/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapContextData, SwapDataProvider, SwapDataStateContext, SwapDataUpdateContext } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { FC, useEffect, useRef } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { swap } from './Data/swaps'
import { Settings } from './Data/settings';
import { initialValues } from './Data/initialValues';
import { IntercomProvider } from 'react-use-intercom';
import { THEME_COLORS } from '../Models/Theme';
import Layout from '../components/layout';
import SwapDetails from '../components/Swap';
import SwapMockFunctions from './Mocks/context/SwapDataUpdate';
import { Formik, FormikProps } from 'formik';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { useArgs } from 'storybook/preview-api';
import WalletsProviders from '../components/WalletProviders';
import { Tabs } from '@/components/Swap/Form/NetworkExchangeTabs';

const Comp: FC<{ settings: any, swapData: SwapContextData, failedSwap?: SwapItem, theme?: "default" | "light", initialValues?: SwapFormValues, timestamp?: string }> = ({ swapData, theme, initialValues }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const appSettings = new LayerSwapAppSettings(Settings)
    const swapContextInitialValues: SwapContextData = {
        swapError: '',
        setSwapError: () => { },
        codeRequested: false, swapBasicData: swapData.swapBasicData, quote: swapData.quote, refuel: swapData.refuel, swapDetails: swapData.swapDetails, depositAddressIsFromAccount: false, withdrawType: undefined, swapTransaction: undefined,
        quoteIsLoading: false,
        swapId: undefined,
        swapModalOpen: false,
        quoteError: undefined
    }

    if (!appSettings) {
        return <div>Loading...</div>
    }
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS["default"];

    return <IntercomProvider appId='123'>
        <SettingsStateContext.Provider value={appSettings}>
            <Layout settings={Settings || undefined} themeData={themeData}>
                <SwapDataProvider >
                    <WalletsProviders basePath={'/'} themeData={THEME_COLORS['default']} appName={'Layerswap'}>
                        <SwapDataStateContext.Provider value={swapContextInitialValues}>
                            <SwapDataUpdateContext.Provider value={SwapMockFunctions}>
                                <Formik
                                    innerRef={formikRef}
                                    initialValues={initialValues!}
                                    validateOnMount={true}
                                    onSubmit={() => { }}
                                >
                                    <Tabs defaultValue="cross-chain">
                                        <Component initialValues={initialValues} />
                                    </Tabs>
                                </Formik>
                            </SwapDataUpdateContext.Provider>
                        </SwapDataStateContext.Provider >
                    </WalletsProviders>
                </SwapDataProvider>
            </Layout>
        </SettingsStateContext.Provider>
    </IntercomProvider>
}

const Component = ({ initialValues }: { initialValues: SwapFormValues | undefined }) => {
    return (
        <SwapDetails type='widget' />
    )
}

const DUMMY_TRANSACTION = {
    from: "0x5da5c2a98e26fd28914b91212b1232d58eb9bbab",
    to: "0x142c03fc8fd30d11ed17ef0f48a9941fd4a66953",
    created_date: "2023-08-16T16:33:23.4937+00:00",
    transaction_hash: "0xae9231b805139bee7e92ddae631b13bb2d13a09e106826b4f08e8efa965d1c27",
    confirmations: 12,
    max_confirmations: 12,
    amount: 0.00093,
    usd_price: 1819.02,
    type: TransactionType,
    usd_value: 1.6916886,
    status: BackendTransactionStatus,
    timestamp: "2024-07-09T09:09:40.725954+00:00",
}

const meta = {
    title: 'Layerswap/Process',
    component: Comp,
    parameters: {
        layout: 'centered',
    },
    args: {
        settings: {},
        theme: 'default',
        timestamp: '',
    },
    argTypes: {
        theme: {
            options: ['light', 'default', 'evmos', 'imxMarketplace', 'ea7df14a1597407f9f755f05e25bab42'],
            control: { type: 'select' },
        },
        timestamp: {
            control: 'date',
        }
    },

    render: function Render(args, { loaded: { settings } }) {
        const [{ swap, timestamp }, updateArgs] = useArgs();

        const handleUpdateArgs = () => {
            const updatedSwap = {
                ...args.swapData,
                transactions: swap?.transactions?.map(transaction => {
                    if (transaction.type === 'input' && (transaction.timestamp || transaction.timestamp === '')) {
                        return {
                            ...transaction,
                            timestamp: timestamp ? new Date(timestamp)?.toISOString() : new Date().toISOString(),
                        };
                    }
                    return transaction;
                }),
            };
            if (updatedSwap?.transactions?.[0]?.timestamp || updatedSwap?.transactions?.[0]?.timestamp === '') {
                updateArgs({ swap: updatedSwap, timestamp: new Date(timestamp)?.toISOString() || new Date().toISOString() })
            }
        }

        useEffect(() => {
            if (timestamp !== swap?.transactions?.[0]?.timestamp) {
                handleUpdateArgs()
            }
        }, [timestamp, swap])
        return <Comp {...args} settings={settings} initialValues={initialValues} />
    },
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;


export const UserTransferInitiated: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            },
            ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.UserTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input, confirmations: 2, max_confirmations: 3 },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    },
    loaders: [
        async () => ({
            A: window.localStorage.setItem("swapTransactions", `{"${swap.swapResponse.swap.id}": {"hash": "0xe1d8539c6dbe522560c41d645f10ffc3f50b8f689a4ce4774573576cb845d5fc", "status":2}}`)
        }),
    ],
};

export const UserTransferDetected: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.UserTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Initiated, type: TransactionType.Input, confirmations: 2, max_confirmations: 3 },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};
export const UserTransferPendingInputCompleted: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Failed,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    },
};

export const LsTransferPending: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.LsTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Output },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const LsTransferPendingWithRefuel: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.LsTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Output },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Refuel },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const LsTransferInitiated: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.LsTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Initiated, type: TransactionType.Output, confirmations: 2, max_confirmations: 5 },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Initiated, type: TransactionType.Refuel, confirmations: 1, max_confirmations: 5 },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const Completed: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Completed,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Output },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Refuel },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        },
    }
};

export const OnlyRefuelCompleted: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.LsTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Output },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Refuel },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};


export const UserTransferDelayed: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.UserTransferDelayed,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Input },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const Failed: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Failed,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const FailedInput: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.UserTransferPending,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Failed, type: TransactionType.Input },
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Pending, type: TransactionType.Output },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    },
    loaders: [
        async () => ({
            A: window.localStorage.setItem("swapTransactions", `{"${swap.swapResponse.swap.id}": {"hash": "0x529ab89f4ed2ece53ca51f52d11e5123f5e5c43c09a9d054d243de0e0829d15f", "status":"failed"}}`),
        }),
    ]
};

export const FailedOutOfRangeAmount: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Failed,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                ]
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const Cancelled: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Cancelled,
                transactions: []
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const Expired: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Expired,
                transactions: []
            },
            refuel: swap.swapResponse.refuel,
            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const RefundPending: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: !!swap.swapResponse.refuel,
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.PendingRefund,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                ]
            },
            refuel: undefined // Remove refuel for refund cases
            ,

            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};

export const RefundCompleted: Story = {
    args: {
        settings: Settings,
        swapData: {
            quoteError: undefined,
            swapBasicData: {
                destination_address: swap.swapResponse.swap.destination_address,
                destination_network: swap.swapResponse.swap.destination_network,
                destination_token: swap.swapResponse.swap.destination_token,
                refuel: false, // No refuel for refund cases
                requested_amount: swap.swapResponse.swap.requested_amount.toString(),
                source_network: swap.swapResponse.swap.source_network,
                source_token: swap.swapResponse.swap.source_token,
                use_deposit_address: swap.swapResponse.swap.use_deposit_address,
                source_exchange: swap.swapResponse.swap.source_exchange
            }, ...swap,
            ...(swap.swapResponse as SwapResponse),
            swapDetails: {
                ...(swap.swapResponse.swap as SwapItem),
                status: SwapStatus.Refunded,
                transactions: [
                    { ...DUMMY_TRANSACTION, status: BackendTransactionStatus.Completed, type: TransactionType.Input },
                ]
            },
            refuel: undefined // Remove refuel for refund cases
            ,

            quoteIsLoading: false,
            swapId: swap.swapResponse.swap.id,
            swapModalOpen: false
        }
    }
};