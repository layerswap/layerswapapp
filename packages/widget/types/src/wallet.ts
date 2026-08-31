import type { NetworkType } from './network';

export type WalletConnectLink = {
  native?: string | null;
  universal?: string | null;
};

export type InternalConnector = {
  name: string;
  id: string;
  icon?: string;
  order?: number;
  type?: 'injected' | 'walletConnect' | 'other' | string;
  isMultiChain?: boolean;
  providerName: string;
  installUrl?: string;
  isMobileSupported?: boolean;
  hasBrowserExtension?: boolean;
  extensionNotFound?: boolean;
  isLoadable?: boolean;
  networkTypes?: NetworkType[];
  mobile?: WalletConnectLink;
  /**
   * Describes where the connector definition came from. Configured connectors
   * use their provider-owned transport; registry connectors are metadata-backed
   * definitions whose execution strategy is selected separately from `type`.
   *
   * Optional for backwards compatibility: an omitted source is treated as a
   * configured connector. Never infer this from `type`, `mobile`, or other
   * presentation metadata.
   */
  source?: 'configured' | 'registry';
};

export type Wallet = {
  id: string;
  internalId?: string;
  displayName?: string;
  isActive: boolean;
  address: string | `0x${string}`;
  addresses: string[];
  providerName: string;
  icon?: string;
  metadata?: {
    starknetAccount?: any;
    wallet?: any;
    l1Address?: string;
    l1ProviderName?: string;
    l1ChainId?: string | number;
    deepLink?: string;
  };
  chainId?: string | number;
  isLoading?: boolean;
  disconnect?: () => Promise<void> | undefined | void;
  connect?: () => Promise<Wallet | undefined>;
  isNotAvailable?: boolean;
  withdrawalSupportedNetworks?: string[];
  asSourceSupportedNetworks?: string[];
  autofillSupportedNetworks?: string[];
  networkIcon?: string;
};

export type WalletConnectConfig = {
  projectId: string;
  name: string;
  description: string;
  url: string;
  icons: string[];
};
