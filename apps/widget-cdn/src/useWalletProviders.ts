import { useMemo } from 'react';
import {
  getDefaultProviders,
  createEVMProvider,
  type DefaultWalletConfig,
} from '@layerswap/wallets';
import type { WalletProviderId } from '@layerswap/widget-types';
import type { Config as WagmiConfig } from 'wagmi';

export type WalletProvidersConfig = {
  include?: Array<WalletProviderId>;
  exclude?: Array<WalletProviderId>;
};

/**
 * Resolve the wallet provider set for a remote widget mount from the shared
 * loader-facing props: defaults → include/exclude filtering → host wagmi
 * adoption. Shared by the `./Widget` (swap) and `./DepositWidget` exposes so
 * the two surfaces resolve providers identically.
 */
export function useWalletProviders(
  walletDefaults: DefaultWalletConfig | undefined,
  walletProvidersConfig: WalletProvidersConfig | undefined,
  wagmiConfig: WagmiConfig | undefined,
): ReturnType<typeof getDefaultProviders> {
  return useMemo(() => {
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
}
