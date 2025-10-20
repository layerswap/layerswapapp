// import { WalletAccount } from 'starknet';
// @ts-ignore
import { StarknetWindowObject } from 'starknetkit';
import { TransferProps } from './transfer';
import { NetworkWithTokens } from '@/Models/Network';
import { BalanceProvider } from './balance';
import { GasProvider } from './gas';
import { AddressUtilsProvider } from './addressUtils';
import { NftProvider } from './nft';

export type InternalConnector = {
    name: string,
    id: string,
    icon?: string | undefined,
    order?: number,
    type?: 'injected' | 'other',
    isMultiChain?: boolean,
    providerName?: string,
    installUrl?: string,
    isMobileSupported?: boolean,
}

export type Wallet = {
    id: string;
    internalId?: string;
    displayName?: string;
    // TODO: might be unused and unnecessary check
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[];
    providerName: string
    icon: (props: any) => React.JSX.Element;
    //TODO: this is name of the connector, should be changed to connectorId
    metadata?: {
        starknetAccount?: any,
        wallet?: StarknetWindowObject,
        l1Address?: string,
        deepLink?: string
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect?: () => Promise<void> | undefined | void;
    connect?: () => Promise<Wallet | undefined>;
    isNotAvailable?: boolean;
    //TODO: refactor
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
    networkIcon?: string,
}

export type WalletProvider = {
    id: string,
    wrapper?: React.ComponentType<any>,
    walletConnectionProvider: (props: WalletConnectionProviderProps) => WalletConnectionProvider,
    addressUtilsProvider?: AddressUtilsProvider | AddressUtilsProvider[],
    nftProvider?: NftProvider | NftProvider[],
    gasProvider?: GasProvider | GasProvider[],
    balanceProvider?: BalanceProvider | BalanceProvider[],
}

export type WalletConnectionProviderProps = {
    networks: NetworkWithTokens[]
}

export type WalletConnectionProvider = {
    connectWallet: (props?: { connector?: InternalConnector }) => Promise<Wallet | undefined> | undefined,
    disconnectWallets?: () => Promise<void> | undefined | void,
    switchAccount: (connector: Wallet, address: string) => Promise<void>,
    switchChain?: (connector: Wallet, chainId: string | number) => Promise<void>
    isNotAvailableCondition?: (connector: string, network: string) => boolean,

    transfer?: (params: TransferProps, wallet?: Wallet) => Promise<string | undefined>,

    availableWalletsForConnect?: InternalConnector[],
    availableHiddenWalletsForConnect?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
    providerIcon?: string,
    unsupportedPlatforms?: string[],
    hideFromList?: boolean,

    multiStepHandlers?: MultiStepHandler[],
}

type MultiStepHandler = {
    component: React.ComponentType<any>,
    supportedNetworks: string[]
}

export type SelectAccountProps = {
    walletId: string;
    address: string;
    providerName: string;
}