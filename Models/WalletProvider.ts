import { AccountInterface } from 'starknet';
import { StarknetWindowObject } from 'starknetkit';

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
        starknetAccount?: AccountInterface,
        wallet?: StarknetWindowObject,
        l1Address?: string,
        deepLink?: string
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect: () => Promise<void> | undefined | void;
    connect?: () => Promise<Wallet | undefined>;
    isNotAvailable?: boolean;
    //TODO: refactor
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
    networkIcon?: string,
}


export type WalletProvider = {
    hideFromList?: boolean,
    connectWallet: (props?: { connector?: InternalConnector }) => Promise<Wallet | undefined> | undefined,
    disconnectWallets?: () => Promise<void> | undefined | void,
    switchAccount?: (connector: Wallet, address: string) => Promise<void>,
    isNotAvailableCondition?: (connector: string, network: string) => boolean,
    availableWalletsForConnect?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
    providerIcon?: string,
}
