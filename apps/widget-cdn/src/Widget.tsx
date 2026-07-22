import { FC, ReactNode, useMemo } from 'react';
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
import type { WidgetProps as SharedWidgetProps } from '@layerswap/widget-types';
import type { Config as WagmiConfig } from 'wagmi';
import '@layerswap/widget/index.css';

/** Wallet provider ids matching what `getDefaultProviders()` emits. */
export type { WalletProviderId } from '@layerswap/widget-types';

/**
 * Props this remote accepts: the shared public contract from
 * `@layerswap/widget-types` (the same shape the vanilla and React loaders
 * forward) with its open slots bound to this app's precise internal types.
 * Deriving it — rather than redeclaring it — keeps the remote and the loaders
 * structurally locked together.
 */
export type WidgetProps = SharedWidgetProps<
  WagmiConfig,
  ReactNode,
  LayerswapWidgetConfig,
  DefaultWalletConfig,
  CallbacksContextType
>;

export type WalletProvidersConfig = NonNullable<WidgetProps['walletProvidersConfig']>;

const Widget: FC<WidgetProps> = ({ config, walletDefaults, walletProvidersConfig, callbacks, wagmiConfig }) => {
  const walletProviders = useMemo(() => {
    let providers = getDefaultProviders(walletDefaults ?? {});

    // Allowlist — keep only the requested ids. Filtering here (before any
    // `loadProvider()` call) means dropped chains never dynamic-import their
    // SDK, so an `include` list gets the same lazy-loading win as `exclude`.
    const included = walletProvidersConfig?.include;
    if (included && included.length > 0) {
      const keep = new Set<string>(included);
      providers = providers.filter((p) => keep.has(p.id));
    }

    // Blocklist — drop the requested ids. Applied after `include` so the two
    // can be combined.
    const excluded = walletProvidersConfig?.exclude;
    if (excluded && excluded.length > 0) {
      const drop = new Set<string>(excluded);
      providers = providers.filter((p) => !drop.has(p.id));
    }

    if (wagmiConfig) {
      // Replace the eager EVM provider with one that adopts the host's wagmi
      // config so the widget tracks the host's account/chain. Only do this
      // when EVM is actually in the resolved set — respect the include/exclude
      // lists literally rather than force-injecting EVM.
      const evmIndex = providers.findIndex((p) => p.id === 'evm');
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
