export { LayerswapWidget } from './LayerswapWidget';
export type { LayerswapWidgetProps, RemoteWidgetProps } from './LayerswapWidget';

// Convenience type re-exports from `@layerswap/widget` so integrators with
// the widget installed as a (optional) peer-dep don't need a second import.
export type {
  LayerswapWidgetConfig,
  CallbacksContextType,
  ThemeData,
  ThemeColor,
} from '@layerswap/widget';
