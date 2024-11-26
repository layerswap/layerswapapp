import { AccountInterface } from 'starknet';
import { StarknetWindowObject } from 'starknetkit';
import { RouteNetwork } from './Network';


export type InternalConnector = {
    name: string,
    id: string,
    icon?: string | undefined,
    order?: number,
    type?: 'injected' | 'other'
}

export type Wallet = {
    // TODO: might be unused and unnecessary check
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[] | `0x${string}`[];
    providerName: string
    icon: (props: any) => React.JSX.Element;
    //TODO: this is name of the connector, should be changed to connectorId
    connector?: string;
    metadata?: {
        starknetAccount?: AccountInterface,
        wallet?: StarknetWindowObject
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect: () => Promise<void> | undefined | void;
    connect: () => Promise<Wallet[] | undefined>;
    isNotAvailable?: boolean;
    //TODO: refactor
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
}


export type WalletProvider = {
    connectWallet: (props?: { chain?: string | number | undefined | null, destination?: RouteNetwork }) => Promise<Wallet[] | undefined>,
    connectConnector?: (props?: { connector: InternalConnector }) => Promise<Wallet[] | undefined> | undefined
    disconnectWallets: () => Promise<void> | undefined | void,
    switchAccount?: (connector: Wallet, address: string) => Promise<void>
    availableWalletsForConnect?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
}
