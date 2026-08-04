'use client';

import type { ReactNode } from 'react';
import type { Config as WagmiConfig } from 'wagmi';
import type { DepositWidgetProps } from '@layerswap/widget-js';
import { RemoteWidgetHost, type RemoteHostCallbacks } from './remoteWidgetHost.js';

/**
 * Shape of the props the CDN remote's DEPOSIT widget export accepts — the
 * shared framework-agnostic contract with its host-specific slots bound to
 * this package's React/wagmi peers, mirroring `RemoteWidgetProps`.
 */
export type RemoteDepositWidgetProps = DepositWidgetProps<WagmiConfig, ReactNode>;

export type LayerswapDepositWidgetProps = RemoteDepositWidgetProps & RemoteHostCallbacks;

/**
 * Host-side React loader for the CDN-delivered Layerswap DEPOSIT widget — the
 * fixed-destination funding flow (the integrator locks the destination
 * network, tokens, and recipient address; the end user only picks a source).
 *
 * Delivered through the same verified manifest + Module Federation pipeline
 * as `LayerswapWidget`; see `RemoteWidgetHost` for the SSR/hydration and
 * loading behavior.
 *
 * ```tsx
 * <LayerswapDepositWidget
 *   config={{ apiKey: 'mainnet' }}
 *   destination={{ network: 'BASE_MAINNET', tokens: ['USDC'] }}
 *   destinationAddress="0x…"
 * />
 * ```
 */
export function LayerswapDepositWidget(props: LayerswapDepositWidgetProps) {
  const { fallback, onReady, onError, ...rest } = props;
  return (
    <RemoteWidgetHost
      expose="DepositWidget"
      widgetProps={rest as RemoteDepositWidgetProps}
      fallback={fallback}
      onReady={onReady}
      onError={onError}
    />
  );
}
