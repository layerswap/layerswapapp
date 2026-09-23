import type { Config as WagmiConfig } from 'wagmi';
import type {
  WidgetProps as VanillaWidgetProps,
  DepositWidgetProps as VanillaDepositWidgetProps,
  WidgetCallbacks,
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

const typedCallbacks: WidgetCallbacks = {
  onTelemetry(event) {
    const schemaVersion: 1 = event.attributes.schema_version;
    const eventId: string = event.attributes.event_id;
    if (event.name === 'widget_operation') {
      const duration: number = event.attributes.duration_ms;
      // @ts-expect-error An operation duration is always numeric.
      const invalid: string = event.attributes.duration_ms;
      void duration;
      void invalid;
    }
    if (event.name === 'widget_flow') {
      const step: string = event.attributes.step;
      void step;
    }
    void schemaVersion;
    void eventId;
  },
  onSwapLifecycle(event) {
    const step: string = event.step;
    // @ts-expect-error Lifecycle observations are not full swap responses.
    event.swap;
    void step;
  },
  onSwapStatusChange(event) {
    const id: string = event.swapId;
    // @ts-expect-error API status events do not include lifecycle steps.
    event.step;
    // @ts-expect-error UI phase is reported on onSwapLifecycle.
    event.phase;
    void id;
  },
  onError(event) {
    const message: string = event.message;
    if (event.type === 'APIError') {
      const method: string = event.requestMethod;
      void method;
    }
    if (event.type === 'CallbackError') {
      const type: 'CallbackError' = event.type;
      const cause: unknown = event.cause;
      void type;
      void cause;
    }
    // @ts-expect-error Error payload fields must not silently become any.
    const invalid: number = event.message;
    void message;
    void invalid;
  },
};
const vanillaCallbacks: VanillaWidgetProps = { callbacks: typedCallbacks };
const reactCallbacks: RemoteWidgetProps = { callbacks: typedCallbacks };
void vanillaCallbacks;
void reactCallbacks;
