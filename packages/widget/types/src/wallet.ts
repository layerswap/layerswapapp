import type { NetworkType } from './network';

export type WalletCapabilities = {
  atomic: 'supported' | 'ready' | 'unsupported';
  /** The wallet can pay gas in a token other than the chain's native currency. */
  alternateGasFees: boolean;
};

/** Capabilities by chain id; 0 holds the wallet's all-chains entry. */
export type ChainCapabilities = Record<number, WalletCapabilities>;

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
  /** Wallet-reported implementation version, when exposed by the provider. */
  version?: string;
  isActive: boolean;
  address: string | `0x${string}`;
  addresses: string[];
  providerName: string;
  icon?: string;
  metadata?: {
    connectorId?: string;
    connectorUid?: string;
    starknetAccount?: any;
    wallet?: any;
    l1Address?: string;
    l1ProviderName?: string;
    l1ChainId?: string | number;
    deepLink?: string;
    /** Runtime wagmi connector identity; separate from the displayed wallet name. */
    evmConnectorUid?: string;
    /** WalletConnect session topic; identifies the session that receives this wallet's requests. */
    walletConnectTopic?: string;
    /** EIP-5792 capabilities by lowercase account, then chain id (0 applies to all chains). */
    capabilities?: Record<string, ChainCapabilities>;
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
