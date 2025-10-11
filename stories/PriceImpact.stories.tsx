import type { Meta, StoryObj } from '@storybook/nextjs';
import { FC } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { Settings } from './Data/settings';
import { initialQuote } from './Data/initialValues';
import { IntercomProvider } from 'react-use-intercom';
import { THEME_COLORS } from '../Models/Theme';
import Layout from '../components/layout';
import WalletsProviders from '../components/WalletProviders';
import { SwapDataProvider } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { TimerProvider } from '@/context/timerContext';
import { PriceImpact } from '@/components/Input/Amount/PriceImpact';

type PriceImpactRelevant = {
    requested_amount: number;
    receive_amount: number;
    blockchain_fee: number;
    service_fee: number;
    source_token: { price_in_usd: number };
    destination_token: { price_in_usd: number };
};

const Comp: FC<{ quote: PriceImpactRelevant; theme?: 'default' | 'light' }> = ({ quote, theme }) => {
    const appSettings = new LayerSwapAppSettings(Settings);
    if (!appSettings) return <div>Loading...</div>;
    const themeData = theme ? THEME_COLORS[theme] : THEME_COLORS['default'];

    return (
        <IntercomProvider appId="123">
            <SettingsStateContext.Provider value={appSettings}>
                <Layout settings={Settings} themeData={themeData}>
                    <SwapDataProvider>
                        <TimerProvider>
                            <WalletsProviders basePath="/" themeData={THEME_COLORS['default']} appName="Layerswap">
                                <PriceImpact
                                    bridgeFee={quote.blockchain_fee}
                                    destinationTokenPriceUsd={quote.destination_token.price_in_usd}
                                    receiveAmount={quote.receive_amount}
                                    requestedAmount={quote.requested_amount}
                                    serviceFee={quote.service_fee}
                                    sourceTokenPriceUsd={quote.source_token.price_in_usd}
                                />
                            </WalletsProviders>
                        </TimerProvider>
                    </SwapDataProvider>
                </Layout>
            </SettingsStateContext.Provider>
        </IntercomProvider>
    );
};

type Args = {
    theme: 'default' | 'light' | 'evmos' | 'imxMarketplace' | 'ea7df14a1597407f9f755f05e25bab42';
    bridgeFee: number;
    serviceFee: number;
    requestedAmount: number;
    receiveAmount: number;
    sourceTokenPriceUsd: number;
    destinationTokenPriceUsd: number;
};

const StoryWrapper: FC<Args> = ({
    theme,
    bridgeFee,
    serviceFee,
    requestedAmount,
    receiveAmount,
    sourceTokenPriceUsd,
    destinationTokenPriceUsd,
}) => {
    const minimalQuote: PriceImpactRelevant = {
        requested_amount: requestedAmount,
        receive_amount: receiveAmount,
        blockchain_fee: bridgeFee,
        service_fee: serviceFee,
        source_token: { price_in_usd: sourceTokenPriceUsd },
        destination_token: { price_in_usd: destinationTokenPriceUsd },
    };

    const themeForComp: 'default' | 'light' = theme === 'light' ? 'light' : 'default';
    return <Comp quote={minimalQuote} theme={themeForComp} />;
};

const meta: Meta<Args> = {
    title: 'Layerswap/Price impact',
    component: StoryWrapper, // ✅ matches Args
    parameters: {
        layout: 'centered',
    },
    args: {
        theme: 'default',
        bridgeFee: initialQuote.blockchain_fee,
        serviceFee: initialQuote.service_fee,
        requestedAmount: initialQuote.requested_amount,
        receiveAmount: initialQuote.receive_amount,
        sourceTokenPriceUsd: initialQuote?.source_token?.price_in_usd,
        destinationTokenPriceUsd: initialQuote?.destination_token?.price_in_usd,
    },
    argTypes: {
        theme: {
            options: ['light', 'default', 'evmos', 'imxMarketplace', 'ea7df14a1597407f9f755f05e25bab42'],
            control: { type: 'select' },
        },
        bridgeFee: { control: { type: 'number' } },
        serviceFee: { control: { type: 'number' } },
        requestedAmount: { control: { type: 'number' } },
        receiveAmount: { control: { type: 'number' } },
        sourceTokenPriceUsd: { control: { type: 'number' } },
        destinationTokenPriceUsd: { control: { type: 'number' } },
    },
};
export default meta;

type Story = StoryObj<Args>;

export const PriceImpactComp: Story = {
    render: (args) => <StoryWrapper {...args} />,
};
