import type { ThemeData } from './theme';

/**
 * Wallet provider ids matching what the remote's `getDefaultProviders()`
 * emits. Enforced at compile time: `@layerswap/wallets` builds every default
 * descriptor through `defineWalletDescriptor`, which requires its id to be a
 * member of this union AND to equal the id of the provider it hydrates into.
 * Note the id for Solana is `'solana'` (the chain), not `'svm'`.
 */
export type WalletProviderId =
  | 'evm'
  | 'starknet'
  | 'fuel'
  | 'paradex'
  | 'bitcoin'
  | 'ton'
  | 'solana'
  | 'tron'
  | 'imtblPassport';

/**
 * Public widget configuration contract.
 *
 * This is the *integrator-facing* surface. The widget package
 * (`@layerswap/widget`) refines it internally — its `LayerswapWidgetConfig`
 * is `WidgetConfig` intersected with precise types for the deep fields
 * (`settings`, `initialValues`) — so the two can never structurally diverge,
 * while integrators and the loaders depend only on this zero-runtime package.
 *
 * Framework-agnostic by construction: `TLoading` is the host's renderable type
 * (`ReactNode` in React hosts — `@layerswap/widget-react` binds it), kept open
 * here so this package carries no dependency on React.
 */
export type WidgetConfig<TLoading = never> = {
  /** Layerswap API key. */
  apiKey?: string;
  /** Network set to target. */
  version?: 'mainnet' | 'testnet';
  /** Visual theme overrides. */
  theme?: ThemeData | null;
  /**
   * Pre-fetched settings blob. Usually fetched by the widget itself; pass it
   * to skip the initial fetch. Precise type: `LayerSwapSettings` in
   * `@layerswap/widget` — kept open here so this package stays standalone.
   */
  settings?: unknown;
  /**
   * Initial form values (source/destination network, token, amount, address).
   * Precise type: `InitialSettings` in `@layerswap/widget`.
   */
  initialValues?: unknown;
  /** Skeleton shown while settings load (`ReactNode` in React hosts). */
  loadingComponent?: TLoading;
  /** @deprecated Pass `walletConnectConfigs` directly to wallet provider factories. */
  walletConnect?: unknown;
  /** @deprecated Pass `imtblPassportConfig` to `createImmutablePassportProvider`. */
  imtblPassport?: unknown;
  /** @deprecated Pass `tonConfigs` to `createTONProvider`. */
  tonConfigs?: unknown;
};

/**
 * Defaults for the bundled `getDefaultProviders()` call inside the remote.
 * Structurally typed — see `@layerswap/wallets`' `DefaultWalletConfig`.
 */
export type WalletDefaults = {
  walletConnect?: {
    projectId: string;
    name?: string;
    description?: string;
    url?: string;
    icons?: string[];
  };
  ton?: { tonApiKey?: string; manifestUrl?: string };
  immutablePassport?: Record<string, unknown>;
};

/**
 * Widget-level event callbacks. Payloads are typed openly so this package
 * carries no dependency on the widget's internal models — import the precise
 * payload types (`SwapResponse`, `SwapFormValues`, `SwapStatusEvent`,
 * `ErrorEventType`) from `@layerswap/widget` if you want them.
 */
export type WidgetCallbacks = {
  onFormChange?: (formData: unknown) => void;
  onSwapCreate?: (swapData: unknown) => void;
  onSwapComplete?: (swapData: unknown) => void;
  onSwapModalStateChange?: (open: boolean) => void;
  onBackClick?: () => void;
  onError?: (error: unknown) => void;
  onSwapStatusChange?: (event: unknown) => void;
  onMenuNavigationChange?: (path: string) => void;
};

/**
 * Props the CDN remote's widget export accepts — the shared shape forwarded by
 * the vanilla `mountWidget` and the React `LayerswapWidget`.
 *
 * Framework-agnostic by construction: `TWagmi` is the host's wagmi `Config`
 * type and `TLoading` the host's renderable type. Both default to `never`, so
 * framework-agnostic consumers cannot accidentally pass runtime-sensitive
 * host objects; `@layerswap/widget-react` deliberately binds them to
 * `WagmiConfig` / `ReactNode`.
 *
 * The remaining parameters let the CDN remote consume this same shape with
 * its precise internal types (`TConfig` = `LayerswapWidgetConfig`,
 * `TWalletDefaults` = `DefaultWalletConfig`, `TCallbacks` =
 * `CallbacksContextType`) instead of redeclaring the contract — so the public
 * and internal prop shapes cannot structurally diverge. Their defaults are
 * the open, integrator-facing types.
 */
export type WidgetProps<
  TWagmi = never,
  TLoading = never,
  TConfig = WidgetConfig<TLoading>,
  TWalletDefaults = WalletDefaults,
  TCallbacks = WidgetCallbacks,
> = {
  /** Widget config — forwarded verbatim to `LayerswapProvider`. */
  config?: TConfig;
  /** Defaults for the bundled `getDefaultProviders()` call. */
  walletDefaults?: TWalletDefaults;
  /**
   * Filter the wallet provider set built inside the remote. `include` is an
   * allowlist (applied first); `exclude` subtracts from it. Chains left out
   * never dynamic-import their SDK, so the bundle stays lean.
   */
  walletProvidersConfig?: {
    include?: Array<WalletProviderId>;
    exclude?: Array<WalletProviderId>;
  };
  /** Widget-level event callbacks. */
  callbacks?: TCallbacks;
  /**
   * Host wagmi `Config`. When supplied, the remote's EVM provider adopts this
   * instance so the widget reads the host's connected account/chain.
   */
  wagmiConfig?: TWagmi;
};
