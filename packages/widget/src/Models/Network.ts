import { Refuel } from "../lib/apiClients/layerSwapApiClient";

export enum NetworkType {
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "starkex",//TODO check this
    ZkSyncLite = "zksynclite",
    TON = 'ton',
    Fuel = 'fuel',
    Bitcoin = 'bitcoin',
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
    deposit_methods: string[]
    token?: Token
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class NetworkWithTokens extends Network {
    tokens: Token[];
}

export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[]
}

export class Token {
    symbol: string;
    display_asset?: string
    logo: string;
    //TODO may be plain string
    contract: string | null | undefined;
    decimals: number;
    price_in_usd: number;
    precision: number;
    listing_date: string;
    status?: 'active' | 'inactive' | 'not_found';
    source_rank?: number | undefined;
    destination_rank?: number | undefined;
}

export class NetworkRouteToken extends Token {
    refuel?: Refuel
}

export class Metadata {
    evm_oracle_contract?: `0x${string}` | null
    evm_multicall_contract?: string | null
    listing_date: string
    zks_paymaster_contract?: `0x${string}` | null
    watchdog_contract?: string | null
}