import type { Meta, StoryObj } from '@storybook/nextjs';
import { SwapItem } from '../lib/apiClients/layerSwapApiClient';
import { SwapStatus } from '../Models/SwapStatus';
import { SwapContextData, SwapDataProvider, SwapDataStateContext, SwapDataUpdateContext } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { FC, useEffect, useRef } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { withdrawSwap as withdrawSwapMock } from './Data/swaps'
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
import { TimerProvider } from '@/context/timerContext';
import { Tabs } from '@/components/Swap/Form/NetworkExchangeTabs';

window.plausible = () => { }
const Comp: FC<{ settings: any, swapData: SwapContextData, failedSwap?: SwapItem, theme?: "default" | "light", initialValues?: SwapFormValues, timestamp?: string }> = ({ swapData, theme, initialValues }) => {
    const formikRef = useRef<FormikProps<SwapFormValues>>(null);
    const appSettings = new LayerSwapAppSettings(Settings)
    const swapContextInitialValues: SwapContextData = {
        codeRequested: false, swapBasicData: swapData.swapBasicData, quote: swapData.quote, refuel: swapData.refuel, swapDetails: swapData.swapDetails, depositAddressIsFromAccount: false, withdrawType: undefined, swapTransaction: undefined,
        quoteIsLoading: false,
        swapId: undefined,
        swapModalOpen: false
    }

    if (!appSettings) {
        return <div>Loading...</div>
    }
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS["default"];

    return <IntercomProvider appId='123'>
        <SettingsStateContext.Provider value={appSettings}>
            <Layout settings={Settings} themeData={themeData}>
                <SwapDataProvider >
                    <TimerProvider>
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
                                        </Tabs >
                                    </Formik>
                                </SwapDataUpdateContext.Provider>
                            </SwapDataStateContext.Provider >
                        </WalletsProviders>
                    </TimerProvider>
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

const meta = {
    title: 'Layerswap/Withdraw',
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
        const [{ withdrawSwap, timestamp }, updateArgs] = useArgs();

        const handleUpdateArgs = () => {
            const updatedSwap = {
                ...args.swapData,
                transactions: withdrawSwap?.transactions?.map(transaction => {
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
                updateArgs({ withdrawSwap: updatedSwap, timestamp: new Date(timestamp)?.toISOString() || new Date().toISOString() })
            }
        }

        useEffect(() => {
            if (timestamp !== withdrawSwap?.transactions?.[0]?.timestamp) {
                handleUpdateArgs()
            }
        }, [timestamp, withdrawSwap])
        return <Comp {...args} settings={settings} initialValues={initialValues} />
    },
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WalletTransfer: Story = {
    args: {
        settings: Settings,

        swapData: {
            swapBasicData: {
                destination_address:
                    withdrawSwapMock.swapResponse?.swap?.destination_address ??
                    withdrawSwapMock.swap?.destination_address,
                destination_network:
                    withdrawSwapMock.swapResponse?.swap?.destination_network ??
                    withdrawSwapMock.swap?.destination_network,
                destination_token:
                    withdrawSwapMock.swapResponse?.swap?.destination_token ??
                    withdrawSwapMock.swap?.destination_token,
                refuel:
                    !!(withdrawSwapMock.swapResponse?.refuel ??
                        withdrawSwapMock.refuel),
                requested_amount:
                    withdrawSwapMock.swapResponse?.swap?.requested_amount ??
                    withdrawSwapMock.swap?.requested_amount,
                source_network:
                    withdrawSwapMock.swapResponse?.swap?.source_network ??
                    withdrawSwapMock.swap?.source_network,
                source_token:
                    withdrawSwapMock.swapResponse?.swap?.source_token ??
                    withdrawSwapMock.swap?.source_token,
                use_deposit_address:
                    withdrawSwapMock.swapResponse?.swap?.use_deposit_address ??
                    withdrawSwapMock.swap?.use_deposit_address,
                source_exchange:
                    withdrawSwapMock.swapResponse?.swap?.source_exchange ??
                    withdrawSwapMock.swap?.source_exchange,
            },

            ...(withdrawSwapMock ?? {}),
            ...(withdrawSwapMock.swapResponse ?? {}),

            swapDetails: {
                ...(withdrawSwapMock.swapResponse?.swap ??
                    withdrawSwapMock.swap ??
                    {}),
                status: SwapStatus.UserTransferPending,
                transactions: [],
            },
            refuel: withdrawSwapMock.swapResponse?.refuel ?? withdrawSwapMock.refuel,
            quoteIsLoading: false,
            swapId:
                withdrawSwapMock.swapResponse?.swap?.id ??
                withdrawSwapMock.swap?.id,
            swapModalOpen: false,
        },
        theme: 'default',
        timestamp: '',
    },

    loaders: [
        async ({ args }) => {
            const id =
                args.swapData?.swapId ??
                args.swapData?.swapId
            if (id) {
                window.localStorage.setItem(
                    'swapTransactions',
                    `{"${id}": {"hash": "0xe1d8539c6dbe522560c41d645f10ffc3f50b8f689a4ce4774576cb845d5fc", "status": 2}}`
                )
            }
            return {}
        },
    ],
};