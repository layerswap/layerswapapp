// import { WalletAccount } from 'starknet';
// @ts-ignore
import { TransferProps, TransferProvider } from './transfer';
import { NetworkWithTokens } from '@/Models/Network';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { AddressUtilsProvider } from './addressUtils';
import { NftProvider } from './nft';
import { ContractAddressCheckerProvider } from './contract';

export type InternalConnector = {
    name: string,
    id: string,
    icon?: string | undefined,
    order?: number,
    type?: 'injected' | 'walletConnect' | 'other' | string,
    isMultiChain?: boolean,
    providerName?: string,
    installUrl?: string,
    isMobileSupported?: boolean,
    isHidden?: boolean,
    hasBrowserExtension?: boolean,
}

export type Wallet = {
    id: string;
    internalId?: string;
    displayName?: string;
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[];
    providerName: string
    icon: (props: any) => React.JSX.Element;
    metadata?: {
        starknetAccount?: any,
        wallet?: any,
        l1Address?: string,
        deepLink?: string
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect?: () => Promise<void> | undefined | void;
    connect?: () => Promise<Wallet | undefined>;
    isNotAvailable?: boolean;
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
    networkIcon?: string,
}

export type WalletProvider = WalletWrapper & {
    walletConnectionProvider: (props: WalletConnectionProviderProps) => WalletConnectionProvider,
    addressUtilsProvider?: AddressUtilsProvider | AddressUtilsProvider[],
    nftProvider?: NftProvider | NftProvider[],
    gasProvider?: GasProvider | GasProvider[],
    balanceProvider?: BalanceProvider | BalanceProvider[],
    transferProvider?: (() => TransferProvider) | (() => TransferProvider)[],
    contractAddressProvider?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[],
}

export type WalletWrapper = {
    id: string,
    wrapper?: React.ComponentType<any>,
}

export type WalletProviderModule = {
    id: string,
    balanceProvider?: BalanceProvider,
    gasProvider?: GasProvider,
    multiStepHandler?: MultiStepHandler,
}

export type WalletConnectionProviderProps = {
    networks: NetworkWithTokens[]
}

export type WalletConnectionProvider = {
    connectWallet: (props?: { connector?: InternalConnector }) => Promise<Wallet | undefined> | undefined,
    disconnectWallets?: () => Promise<void> | undefined | void,
    switchAccount?: (connector: Wallet, address: string) => Promise<void>,
    switchChain?: (connector: Wallet, chainId: string | number) => Promise<void>
    isNotAvailableCondition?: (connector: string, network: string, purpose?: "withdrawal" | "autofill" | "asSource") => boolean,

    /**
     * @deprecated Use TransferResolver from useTransfer() hook instead. This will be removed in a future version.
     * Transfer providers should now be configured via WalletProvider.transferProvider.
     */
    transfer?: (params: TransferProps, wallet?: Wallet) => Promise<string | undefined>,

    availableWalletsForConnect?: InternalConnector[],
    availableHiddenWalletsForConnect?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
    providerIcon?: string,
    unsupportedPlatforms?: string[],
    hideFromList?: boolean,
    ready: boolean,

    multiStepHandlers?: MultiStepHandler[],
}

export type MultiStepHandler = {
    component: React.ComponentType<any>,
    supportedNetworks: string[]
}

export type SelectAccountProps = {
    walletId: string;
    address: string;
    providerName: string;
}

export type BaseWalletProviderConfig = {
    customHook?: (props: WalletConnectionProviderProps) => WalletConnectionProvider
    balanceProviders?: BalanceProvider | BalanceProvider[]
    gasProviders?: GasProvider | GasProvider[]
    addressUtilsProviders?: AddressUtilsProvider | AddressUtilsProvider[]
    transferProviders?: (() => TransferProvider) | (() => TransferProvider)[]
    contractAddressProviders?: ContractAddressCheckerProvider | ContractAddressCheckerProvider[]
} 