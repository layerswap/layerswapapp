import type { Config as WagmiConfig } from 'wagmi';
import type {
  WidgetProps as VanillaWidgetProps,
  DepositWidgetProps as VanillaDepositWidgetProps,
} from '@layerswap/widget-js';
import type { RemoteWidgetProps } from '../src/LayerswapWidget';
import type { RemoteDepositWidgetProps } from '../src/LayerswapDepositWidget';

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

const vanillaDepositProps: VanillaDepositWidgetProps = {
  config: { apiKey: 'mainnet' },
  destination: { network: 'BASE_MAINNET', tokens: ['USDC'] },
  destinationAddress: '0x0000000000000000000000000000000000000000',
  methods: ['wallet', 'deposit_address'],
};

// @ts-expect-error `destination` and `destinationAddress` are required.
const invalidDepositMissingDestination: VanillaDepositWidgetProps = {
  config: { apiKey: 'mainnet' },
};

const invalidDepositMethod: VanillaDepositWidgetProps = {
  destination: { network: 'BASE_MAINNET', tokens: ['USDC'] },
  destinationAddress: '0x0000000000000000000000000000000000000000',
  // @ts-expect-error Unknown deposit method id.
  methods: ['bank_transfer'],
};

const reactDepositProps: RemoteDepositWidgetProps = {
  wagmiConfig,
  config: { loadingComponent: 'Loading widget…' },
  destination: { network: 'BASE_MAINNET', tokens: ['USDC'] },
  destinationAddress: '0x0000000000000000000000000000000000000000',
  mode: 'button',
};

void vanillaProps;
void invalidVanillaWagmi;
void invalidVanillaLoading;
void reactProps;
void vanillaDepositProps;
void invalidDepositMissingDestination;
void invalidDepositMethod;
void reactDepositProps;
