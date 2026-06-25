import { FC, useMemo } from 'react';
import {
  LayerswapProvider,
  Swap,
  type LayerswapWidgetConfig,
  type CallbacksContextType,
} from '@layerswap/widget';
import {
  getDefaultProviders,
  createEVMProvider,
  type DefaultWalletConfig,
} from '@layerswap/wallets';
import type { Config as WagmiConfig } from 'wagmi';
import '@layerswap/widget/index.css';

/**
 * Known wallet provider ids matching what `getDefaultProviders()` emits.
 * Exposed for type-safe `exclude` lists.
 */
export type WalletProviderId =
  | 'evm'
  | 'starknet'
  | 'fuel'
  | 'paradex'
  | 'bitcoin'
  | 'ton'
  | 'svm'
  | 'tron'
  | 'imtblPassport';

export type WalletProvidersConfig = {
  /**
   * Allowlist — keep only these provider ids. When omitted, all default
   * providers are kept. Applied before `exclude`, so the two can be
   * combined (include a broad set, then subtract a few).
   */
  include?: WalletProviderId[];
  /** Blocklist — drop these provider ids from the set. */
  exclude?: WalletProviderId[];
};

export type WidgetProps = {
  config?: LayerswapWidgetConfig;
  walletDefaults?: DefaultWalletConfig;
  /**
   * Filter/customize the wallet provider set built by
   * `getDefaultProviders()`. Today supports `exclude`; per-chain overrides
   * can be added here without breaking the integrator API.
   */
  walletProvidersConfig?: WalletProvidersConfig;
  /**
   * Widget-level event callbacks (onSwapCreate, onSwapComplete, onError, …).
   * Forwarded verbatim to `LayerswapProvider`'s `callbacks` prop.
   */
  callbacks?: CallbacksContextType;
  /**
   * Host's wagmi `Config`. When passed, the EVM wallet provider adopts it
   * via `createEVMProvider({ wagmiConfig })` so the widget's EVM state
   * (account, chain, signer) tracks the host's existing wagmi store
   * instead of constructing its own.
   */
  wagmiConfig?: WagmiConfig;
};

const Widget: FC<WidgetProps> = ({ config, walletDefaults, walletProvidersConfig, callbacks, wagmiConfig }) => {
  const walletProviders = useMemo(() => {
    let providers = getDefaultProviders(walletDefaults ?? {});

    // Allowlist — keep only the requested ids. Filtering here (before any
    // `loadProvider()` call) means dropped chains never dynamic-import their
    // SDK, so an `include` list gets the same lazy-loading win as `exclude`.
    const included = walletProvidersConfig?.include;
    if (included && included.length > 0) {
      const keep = new Set<string>(included);
      providers = providers.filter((p) => keep.has((p as { id?: string }).id ?? ''));
    }

    // Blocklist — drop the requested ids. Applied after `include` so the two
    // can be combined.
    const excluded = walletProvidersConfig?.exclude;
    if (excluded && excluded.length > 0) {
      const drop = new Set<string>(excluded);
      providers = providers.filter((p) => !drop.has((p as { id?: string }).id ?? ''));
    }

    if (wagmiConfig) {
      // Replace the eager EVM provider with one that adopts the host's wagmi
      // config so the widget tracks the host's account/chain. Only do this
      // when EVM is actually in the resolved set — respect the include/exclude
      // lists literally rather than force-injecting EVM.
      const evmIndex = providers.findIndex((p) => (p as { id?: string }).id === 'evm');
      if (evmIndex >= 0) {
        providers[evmIndex] = createEVMProvider({
          walletConnectConfigs: walletDefaults?.walletConnect,
          wagmiConfig,
        });
      }
    }

    return providers;
  }, [wagmiConfig, walletDefaults, walletProvidersConfig]);

  return (
    <LayerswapProvider config={config} walletProviders={walletProviders} callbacks={callbacks}>
      <Swap />
    </LayerswapProvider>
  );
};

export default Widget;
