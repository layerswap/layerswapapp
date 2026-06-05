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

export type WidgetProps = {
  config?: LayerswapWidgetConfig;
  walletDefaults?: DefaultWalletConfig;
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

const Widget: FC<WidgetProps> = ({ config, walletDefaults, callbacks, wagmiConfig }) => {
  const walletProviders = useMemo(() => {
    if (!wagmiConfig) return getDefaultProviders(walletDefaults ?? {});
    // Replace the default eager EVM provider with one that adopts the
    // host's wagmi config. All other defaults (descriptors for non-EVM
    // chains) stay intact and remain lazy.
    const defaults = getDefaultProviders(walletDefaults ?? {});
    const evmIndex = defaults.findIndex(
      (p) => (p as { id?: string }).id === 'evm',
    );
    const hostEvm = createEVMProvider({
      walletConnectConfigs: walletDefaults?.walletConnect,
      wagmiConfig,
    });
    if (evmIndex >= 0) defaults[evmIndex] = hostEvm;
    else defaults.unshift(hostEvm);
    return defaults;
  }, [wagmiConfig, walletDefaults]);

  return (
    <LayerswapProvider config={config} walletProviders={walletProviders} callbacks={callbacks}>
      <Swap />
    </LayerswapProvider>
  );
};

export default Widget;
