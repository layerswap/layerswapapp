export { LayerswapWidget } from './LayerswapWidget.js';
export type { LayerswapWidgetProps, RemoteWidgetProps } from './LayerswapWidget.js';
export { LayerswapDepositWidget } from './LayerswapDepositWidget.js';
export type { LayerswapDepositWidgetProps, RemoteDepositWidgetProps } from './LayerswapDepositWidget.js';
// Manifest format + error type live in the framework-agnostic core.
export type { Manifest } from '@layerswap/widget-js';
export { ManifestError } from '@layerswap/widget-js';

// Widget prop/config/theme contract, re-exported (via the core) from the
// shared `@layerswap/widget-types` package — no dependency on
// the heavy `@layerswap/widget` package. The shared contract is
// framework-agnostic (its React/wagmi slots are generic); this package binds
// them to its own peers so React hosts get concrete types.
import type { ReactNode } from 'react';
import type { Config as WagmiConfig } from 'wagmi';
import type {
  WidgetConfig as SharedWidgetConfig,
  WidgetProps as SharedWidgetProps,
  DepositWidgetProps as SharedDepositWidgetProps,
} from '@layerswap/widget-js';

export type WidgetConfig = SharedWidgetConfig<ReactNode>;
export type WidgetProps = SharedWidgetProps<WagmiConfig, ReactNode>;
export type DepositWidgetProps = SharedDepositWidgetProps<WagmiConfig, ReactNode>;
export type {
  WidgetCallbacks,
  WalletDefaults,
  WalletProviderId,
  DepositConfig,
  DepositMethodId,
  SupportedDestination,
  ThemeData,
  ThemeColor,
} from '@layerswap/widget-js';
