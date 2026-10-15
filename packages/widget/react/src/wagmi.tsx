'use client';

import * as wagmi from 'wagmi';
import * as core from '@wagmi/core';
import * as viem from 'viem';
import * as query from '@tanstack/react-query';
import wagmiPackage from 'wagmi/package.json' with { type: 'json' };
import corePackage from '@wagmi/core/package.json' with { type: 'json' };
import viemPackage from 'viem/package.json' with { type: 'json' };
import queryPackage from '@tanstack/react-query/package.json' with { type: 'json' };
import type { LayerswapWidgetProps } from './LayerswapWidget.js';
import type { LayerswapDepositWidgetProps } from './LayerswapDepositWidget.js';
import { RemoteWidgetHost } from './remoteWidgetHost.js';
import { createWalletRuntimeShare } from './walletRuntimeShare.js';

// These are actual host module objects, not new configs or reconstructed exports.
// Kept in a separate entry point so ordinary hosts do not need wallet peers.
const walletShare = createWalletRuntimeShare({
  wagmi, core, viem, query,
  versions: {
    wagmi: wagmiPackage.version, core: corePackage.version,
    viem: viemPackage.version, query: queryPackage.version,
  },
});

export type SharedWagmiWidgetProps = LayerswapWidgetProps & { wagmiConfig: wagmi.Config };
export type SharedWagmiDepositWidgetProps = LayerswapDepositWidgetProps & { wagmiConfig: wagmi.Config };

/** Use the host's wagmi runtime, Query context, and exact config instance. */
export function LayerswapWidget({ fallback, onReady, onError, ...widgetProps }: SharedWagmiWidgetProps) {
  return <RemoteWidgetHost expose="Widget" widgetProps={widgetProps} walletShare={walletShare}
    fallback={fallback} onReady={onReady} onError={onError} />;
}

export function LayerswapDepositWidget({ fallback, onReady, onError, ...widgetProps }: SharedWagmiDepositWidgetProps) {
  return <RemoteWidgetHost expose="DepositWidget" widgetProps={widgetProps} walletShare={walletShare}
    fallback={fallback} onReady={onReady} onError={onError} />;
}
