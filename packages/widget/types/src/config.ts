import type { ThemeData } from "./theme";

/**
 * Wallet provider ids matching what the remote's `getDefaultProviders()`
 * emits. Enforced at compile time: `@layerswap/wallets` builds every default
 * descriptor through `defineWalletDescriptor`, which requires its id to be a
 * member of this union AND to equal the id of the provider it hydrates into.
 * Note the id for Solana is `'solana'` (the chain), not `'svm'`.
 */
export type WalletProviderId =
  | "evm"
  | "starknet"
  | "fuel"
  | "paradex"
  | "bitcoin"
  | "ton"
  | "solana"
  | "tron"
  | "imtblPassport";

/**
 * Public widget configuration contract.
 *
 * This is the *integrator-facing* surface. The widget package
 * (`@layerswap/widget`) refines it internally — its `LayerswapWidgetConfig`
 * is `WidgetConfig` intersected with precise types for the deep fields
 * (`settings`, `initialValues`) — so the two can never structurally diverge,
 * while integrators and the loaders depend only on this lightweight package.
 *
 * Framework-agnostic by construction: `TLoading` is the host's renderable type
 * (`ReactNode` in React hosts — `@layerswap/widget-react` binds it), kept open
 * here so this package carries no dependency on React.
 */
export type WidgetConfig<TLoading = never> = {
  /** Layerswap API key. */
  apiKey?: string;
  apiUri?: string;
  /** Network set to target. */
  version?: "mainnet" | "testnet";
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
 * The single destination the deposit widget funds. Structurally typed — the
 * precise source of truth is `SupportedDestination` in `@layerswap/widget`
 * (`components/Pages/Deposit/DestinationTokenPicker.tsx`); the CDN remote
 * spreads these props into that component, so a divergence fails its
 * typecheck rather than drifting silently.
 */
export type SupportedDestination = {
  /** Network `name` (canonical identifier like `BASE_MAINNET`). */
  network: string;
  /** Token symbols (case-insensitive, e.g. `["USDC", "USDT"]`). The user picks
   * one of these via the token dropdown; the network is fixed. */
  tokens: string[];
};

/**
 * Deposit funding methods. Mirrors `DEPOSIT_METHODS` in `@layerswap/widget`
 * (`components/Pages/Deposit/depositMethods.ts`) — kept in lockstep by the CDN
 * remote's typecheck, same as {@link SupportedDestination}.
 */
export type DepositMethodId =
  | "wallet"
  | "deposit_address"
  | "hyperliquid"
  | "polymarket";

/**
 * Deposit-widget-specific props — the integrator-facing surface of
 * `DepositProps` in `@layerswap/widget`. `partner` is deliberately not part of
 * the public contract (it is a Layerswap-internal model).
 */
export type DepositConfig = {
  /** The single destination network and its allowed tokens. The network is
   * fixed; the user picks one of the tokens via the token dropdown. */
  destination: SupportedDestination;
  /** Recipient address on the destination network. Required — the deposit
   * widget never asks the end user for this. */
  destinationAddress: string;
  /** "inline" (default) renders the widget directly. "button" renders a Deposit
   * button that opens the widget inside a dialog. */
  mode?: "inline" | "button";
  /** Title shown in the widget header. Defaults to "Deposit". */
  title?: string;
  /** Label for the trigger button when mode="button". Defaults to "Deposit". */
  buttonLabel?: string;
  /** Extra className applied to the trigger button when mode="button". */
  buttonClassName?: string;
  /** When true, show the "Send to" destination address row in the quote
   * summary. Defaults to false. */
  showDestinationAddress?: boolean;
  actionButtonText?: string;
  /** Default amount (in USD) seeded into the wallet flow once the user
   * picks a source token. Defaults to $1. Set to 0 to disable seeding. */
  defaultAmountUsd?: number;
  /** The deposit funding methods to offer, e.g. `['wallet','deposit_address']`.
   * Acts as an allow-list: only listed methods can appear (a method also still
   * needs its own runtime condition). Defaults to all available methods. */
  methods?: DepositMethodId[];
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

/**
 * Props the CDN remote's DEPOSIT widget export accepts — the shared shape
 * forwarded by the vanilla `mountDepositWidget` and the React
 * `LayerswapDepositWidget`: the common widget props plus the deposit-specific
 * configuration, flattened to mirror `Deposit`'s props in `@layerswap/widget`.
 *
 * Same generic scheme as {@link WidgetProps}: framework-agnostic by default,
 * bound to precise host/remote types by `@layerswap/widget-react` and the CDN
 * remote respectively.
 */
export type DepositWidgetProps<
  TWagmi = never,
  TLoading = never,
  TConfig = WidgetConfig<TLoading>,
  TWalletDefaults = WalletDefaults,
  TCallbacks = WidgetCallbacks,
> = WidgetProps<TWagmi, TLoading, TConfig, TWalletDefaults, TCallbacks> &
  DepositConfig;
