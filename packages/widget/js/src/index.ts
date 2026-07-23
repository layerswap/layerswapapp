// Vanilla, framework-agnostic mount API — the primary entry point.
export { mountWidget } from './mount.js';
export type { WidgetHandle, MountOptions } from './mount.js';

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
export { resolveSource } from './loader.js';
export type { ResolvedSource } from './loader.js';
export { initRemote, loadRemoteModule } from './runtime.js';
export type { SharedLib } from './runtime.js';

// Manifest format + verification primitives.
export {
  ManifestError,
  MANIFEST_VERIFY_PUBLIC_KEY_SPKI_B64,
  MANIFEST_CLOCK_SKEW_MS,
  DEFAULT_MANIFEST_URL,
  verifyManifest,
  manifestFreshness,
  canonicalize,
  fetchManifest,
  resolveRemoteEntry,
} from './manifest.js';
export type { Manifest, FetchedManifest } from './manifest.js';

// Runtime SRI interceptor.
export { registerChunkHashes } from './sri.js';
