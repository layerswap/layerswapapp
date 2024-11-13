import type { Config as WagmiConfig } from '@wagmi/core';
import type { Provider as FuelProvider, StorageAbstract } from 'fuels';
import { PredicateConfig } from '../../common';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

export type WalletConnectConfig = {
  fuelProvider?: FuelProvider | Promise<FuelProvider>;
  projectId?: string;
  adapter?: WagmiAdapter;
  predicateConfig?: PredicateConfig;
  storage?: StorageAbstract;
  chainId?: number;
  // if the dapp already has wagmi from eth connectors, it's better to skip auto reconnection as it can lead to session loss when refreshing the page
  skipAutoReconnect?: boolean;
};