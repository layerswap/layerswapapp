// Vanilla, framework-agnostic mount API — the primary entry point.
export { mountWidget } from './mount';
export type { WidgetHandle, MountOptions } from './mount';

// Shared widget prop/config/theme contract, re-exported from the zero-runtime
// `@layerswap/widget-types` package (the single source of truth).
export type {
  WidgetProps,
  WidgetConfig,
  WidgetCallbacks,
  WalletDefaults,
  WalletProviderId,
  ThemeData,
  ThemeColor,
} from '@layerswap/widget-types';

// Lower-level building blocks, reused by `@layerswap/widget-react` and
// available for advanced integrators wiring their own loader.
export { resolveSource } from './loader';
export type { ResolvedSource } from './loader';
export { initRemote, loadRemoteModule } from './runtime';
export type { SharedLib } from './runtime';

// Manifest format + verification primitives.
export {
  ManifestError,
  MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64,
  DEFAULT_MANIFEST_URL,
  verifyManifest,
  canonicalize,
  fetchManifest,
  resolveRemoteEntry,
} from './manifest';
export type { Manifest, FetchedManifest } from './manifest';

// Runtime SRI interceptor.
export { registerChunkHashes } from './sri';
