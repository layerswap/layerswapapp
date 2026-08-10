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
