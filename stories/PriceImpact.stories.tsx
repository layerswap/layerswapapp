import type { Meta, StoryObj } from '@storybook/nextjs';
import { SwapQuote } from '../lib/apiClients/layerSwapApiClient';
import { SwapDataProvider } from '../context/swap';
import { SettingsStateContext } from '../context/settings';
import { FC } from 'react';
import { LayerSwapAppSettings } from '../Models/LayerSwapAppSettings';
import { Settings } from './Data/settings';
import { initialQuote } from './Data/initialValues';
import { IntercomProvider } from 'react-use-intercom';
import { THEME_COLORS } from '../Models/Theme';
import Layout from '../components/layout';
import WalletsProviders from '../components/WalletProviders';
import { TimerProvider } from '@/context/timerContext';
import { PriceImpact } from '@/components/Input/Amount/PriceImpact';

const Comp: FC<{ quote: SwapQuote, theme?: "default" | "light" }> = ({ quote, theme }) => {
    const appSettings = new LayerSwapAppSettings(Settings)

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
                            <Component quote={quote} />
                        </WalletsProviders>
                    </TimerProvider>
                </SwapDataProvider>
            </Layout>
        </SettingsStateContext.Provider>
    </IntercomProvider>
}

const Component = ({ quote }: { quote: SwapQuote }) => {
    return (
        <PriceImpact bridgeFee={quote?.blockchain_fee} destinationTokenPriceUsd={quote?.destination_token?.price_in_usd} receiveAmount={quote?.receive_amount} requestedAmount={quote?.requested_amount} serviceFee={quote?.service_fee} sourceTokenPriceUsd={quote?.source_token?.price_in_usd} />
    )
}

const meta = {
    title: 'Layerswap/Price impact',
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
        }
    },
} satisfies Meta<typeof Comp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PriceImpactComp: Story = {
    args: {
        quote: initialQuote,
        theme: 'default',
    },
};