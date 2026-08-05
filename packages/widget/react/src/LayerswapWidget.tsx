'use client';

import type { ReactNode } from 'react';
import type { Config as WagmiConfig } from 'wagmi';
import type { WidgetProps } from '@layerswap/widget-js';
import { RemoteWidgetHost, type RemoteHostCallbacks } from './remoteWidgetHost.js';

/** Wallet provider ids matching what the remote's `getDefaultProviders()` emits. */
export type { WalletProviderId } from '@layerswap/widget-js';

/**
 * Shape of the props the CDN remote's widget export accepts — the shared
 * framework-agnostic contract with its host-specific slots bound to this
 * package's React/wagmi peers (`wagmiConfig: Config`,
 * `loadingComponent: ReactNode`), so the React and vanilla packages stay in
 * lockstep.
 */
export type RemoteWidgetProps = WidgetProps<WagmiConfig, ReactNode>;

export type LayerswapWidgetProps = RemoteWidgetProps & RemoteHostCallbacks;
// The widget's source is not configurable: it is always fetched from the
// canonical Layerswap CDN baked into `@layerswap/widget-js`, with its
// manifest signature verified. This keeps the remote bundle's origin under
// Layerswap's control rather than the integrator's.

/**
 * Host-side React loader for the CDN-delivered Layerswap swap widget.
 *
 * Safe to import from anywhere in Next.js — see `RemoteWidgetHost` for the
 * SSR/hydration and loading behavior.
 */
export function LayerswapWidget(props: LayerswapWidgetProps) {
  const { fallback, onReady, onError, ...rest } = props;
  return (
    <RemoteWidgetHost
      expose="Widget"
      widgetProps={rest as RemoteWidgetProps}
      fallback={fallback}
      onReady={onReady}
      onError={onError}
    />
  );
}
