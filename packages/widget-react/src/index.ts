export { LayerswapEmbed } from './LayerswapEmbed';
export type { LayerswapEmbedProps, RemoteWidgetProps } from './LayerswapEmbed';

// Convenience type re-exports from `@layerswap/widget` so integrators with
// the widget installed as a (optional) peer-dep don't need a second import.
export type {
  LayerswapWidgetConfig,
  CallbacksContextType,
  ThemeData,
  ThemeColor,
} from '@layerswap/widget';
