import type { Config as WagmiConfig } from 'wagmi';
import type { WidgetProps as VanillaWidgetProps } from '@layerswap/widget-js';
import type { RemoteWidgetProps } from '../src/LayerswapWidget';

const vanillaProps: VanillaWidgetProps = { config: { apiKey: 'mainnet' } };

const invalidVanillaWagmi: VanillaWidgetProps = {
  // @ts-expect-error Vanilla hosts cannot pass a React/wagmi host object.
  wagmiConfig: 'invalid',
};

const invalidVanillaLoading: VanillaWidgetProps = {
  config: {
    // @ts-expect-error Vanilla hosts cannot pass a React renderable.
    loadingComponent: {},
  },
};

declare const wagmiConfig: WagmiConfig;
const reactProps: RemoteWidgetProps = {
  wagmiConfig,
  config: { loadingComponent: 'Loading widget…' },
};

void vanillaProps;
void invalidVanillaWagmi;
void invalidVanillaLoading;
void reactProps;
