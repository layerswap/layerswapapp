export { LayerswapWidget } from './LayerswapWidget';
export type { LayerswapWidgetProps, RemoteWidgetProps } from './LayerswapWidget';
// Manifest format + error type live in the framework-agnostic core.
export type { Manifest } from '@layerswap/widget-js';
export { ManifestError } from '@layerswap/widget-js';

// Widget prop/config/theme contract, re-exported (via the core) from the
// shared zero-runtime `@layerswap/widget-types` package — no dependency on
// the heavy `@layerswap/widget` package.
export type {
  WidgetConfig,
  WidgetCallbacks,
  WidgetProps,
  WalletDefaults,
  WalletProviderId,
  ThemeData,
  ThemeColor,
} from '@layerswap/widget-js';
