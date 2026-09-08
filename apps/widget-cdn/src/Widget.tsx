import { FC, ReactNode } from 'react';
import {
  LayerswapProvider,
  Swap,
  type LayerswapWidgetConfig,
  type CallbacksContextType,
} from '@layerswap/widget';
import { type DefaultWalletConfig } from '@layerswap/wallets';
import type { WidgetProps as SharedWidgetProps } from '@layerswap/widget-types';
import type { Config as WagmiConfig } from 'wagmi';
import { useWalletProviders } from './useWalletProviders';
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
  const walletProviders = useWalletProviders(walletDefaults, walletProvidersConfig, wagmiConfig);

  return (
    <LayerswapProvider config={config} walletProviders={walletProviders} callbacks={callbacks}>
      <Swap />
    </LayerswapProvider>
  );
};

export default Widget;
