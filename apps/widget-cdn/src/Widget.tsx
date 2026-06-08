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
  /** Drop these provider ids from the default set. */
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
    const defaults = getDefaultProviders(walletDefaults ?? {});

    if (wagmiConfig) {
      // Replace the default eager EVM provider with one that adopts the
      // host's wagmi config. All other defaults (descriptors for non-EVM
      // chains) stay intact and remain lazy.
      const evmIndex = defaults.findIndex((p) => (p as { id?: string }).id === 'evm');
      const hostEvm = createEVMProvider({
        walletConnectConfigs: walletDefaults?.walletConnect,
        wagmiConfig,
      });
      if (evmIndex >= 0) defaults[evmIndex] = hostEvm;
      else defaults.unshift(hostEvm);
    }

    const excluded = walletProvidersConfig?.exclude;
    if (excluded && excluded.length > 0) {
      const drop = new Set<string>(excluded);
      return defaults.filter((p) => !drop.has((p as { id?: string }).id ?? ''));
    }

    return defaults;
  }, [wagmiConfig, walletDefaults, walletProvidersConfig]);

  return (
    <LayerswapProvider config={config} walletProviders={walletProviders} callbacks={callbacks}>
      <Swap />
    </LayerswapProvider>
  );
};

export default Widget;
