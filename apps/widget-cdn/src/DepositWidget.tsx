import { FC, ReactNode } from 'react';
import {
  type LayerswapWidgetConfig,
  type CallbacksContextType,
} from '@layerswap/widget';
import { Deposit } from '@layerswap/widget/deposit';
import { type DefaultWalletConfig } from '@layerswap/wallets';
import type { DepositWidgetProps as SharedDepositWidgetProps } from '@layerswap/widget-types';
import type { Config as WagmiConfig } from 'wagmi';
import { useWalletProviders } from './useWalletProviders';
import '@layerswap/widget/index.css';

/**
 * Props the `./DepositWidget` expose accepts: the shared public contract from
 * `@layerswap/widget-types` (the same shape `mountDepositWidget` and the React
 * `LayerswapDepositWidget` forward) with its open slots bound to this app's
 * precise internal types — same derivation scheme as `./Widget`.
 *
 * The deposit-specific fields (`destination`, `methods`, …) are structurally
 * typed in the shared package; spreading them into `Deposit` below is what
 * keeps the two declarations in lockstep — a divergence fails this file's
 * typecheck.
 */
export type DepositWidgetProps = SharedDepositWidgetProps<
  WagmiConfig,
  ReactNode,
  LayerswapWidgetConfig,
  DefaultWalletConfig,
  CallbacksContextType
>;

const DepositWidget: FC<DepositWidgetProps> = ({
  config,
  walletDefaults,
  walletProvidersConfig,
  callbacks,
  wagmiConfig,
  ...depositProps
}) => {
  const walletProviders = useWalletProviders(walletDefaults, walletProvidersConfig, wagmiConfig);

  // `Deposit` wraps `LayerswapProvider` itself (and installs its own
  // deposit-shaped loading skeleton), so unlike `./Widget` there is no
  // provider wrapper here.
  return (
    <Deposit config={config} walletProviders={walletProviders} callbacks={callbacks} {...depositProps} />
  );
};

export default DepositWidget;
