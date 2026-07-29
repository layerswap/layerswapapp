// The widget prop/config/callback contract lives in the shared, lightweight
// `@layerswap/widget-types` package so the widget and every loader share one
// source of truth. Re-exported here for local (`./types`) imports.
export type {
  WidgetProps,
  WidgetConfig,
  WidgetCallbacks,
  WalletDefaults,
  WalletProviderId,
} from "@layerswap/widget-types";
