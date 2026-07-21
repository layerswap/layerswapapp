export enum AddressSelectionMode {
    // Unambiguous — assign the type directly
    Auto = 'auto',
    // One address spans many networks of this type — user picks networks
    Networks = 'networks',
    // Address format shared with other providers — user disambiguates the type (Starknet, Fuel)
    Overlap = 'overlap',
}

export interface AddressUtilsProvider {
    providerName: string,
    supportsNetwork(network: { name: string }): boolean,
    isValidAddress: (props: AddressUtilsProviderProps) => boolean,
    addressFormat?: (props: AddressUtilsProviderProps) => string,
    // The network type this provider validates — used by address classification.
    networkType: NetworkType,
    // Human-readable label for the type (e.g. "EVM", "Starknet").
    label: string,
    // How a classified address of this type maps to a network scope.
    selection: AddressSelectionMode,
    // For `Networks` mode: how the default network selection is seeded. Ignored for other selection modes.
    defaultScope?: 'all' | 'primary',
}

export type AddressUtilsProviderProps = {
    address: string,
    network?: { name: string } | null,
    providerName?: string
}

export class Network {
    name: string;
    display_name: string;
    logo: string;
    chain_id: string | null;
    node_url: string;
    nodes: string[];
    type: NetworkType;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata?: Metadata;
    deposit_methods: string[];
    token?: Token;
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class NetworkWithTokens extends Network {
    tokens: Token[];
}

export class Token {
    symbol: string;
    display_asset?: string;
    logo: string;
    //TODO may be plain string
    contract: string | null | undefined;
    decimals: number;
    price_in_usd: number;
    precision: number;
    listing_date: string;
    status?: 'active' | 'inactive' | 'not_found';
    supports_gasless_deposit?: boolean;
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class Metadata {
    evm_oracle_contract?: `0x${string}` | null;
    evm_multicall_contract?: string | null;
    listing_date: string;
    zks_paymaster_contract?: `0x${string}` | null;
    watchdog_contract?: string | null;
}

export type Refuel = {
    network: Network
    token: Token,
    amount: number,
    amount_in_usd: number
}

export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[]
}

export class NetworkRouteToken extends Token {
    refuel?: Refuel
}

export type AvailableSourceNetworkTypes = {
    all: true
    networks?: never
} | {
    all: false
    networks: string[]
}

// Local copy of the network type values (mirrors Models/Network.ts in the widget).
// Kept here so utils does not depend on @layerswap/widget.
export enum NetworkType {
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "starkex",
    TON = 'ton',
    Fuel = 'fuel',
    Bitcoin = 'bitcoin',
    Tron = 'tron',
    Hyperliquid = 'hyperliquid',
    Polymarket = 'polymarket'
}
