export enum NetworkType {
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "stark_ex",
    ZkSyncLite = "zk_sync_lite",
    TON = 'ton'
}

export class Network {
    name: string;
    display_name: string;
    logo: string;
    chain_id: string | null;
    node_url: string;
    type: NetworkType;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata: Metadata;
}

export class CryptoNetwork extends Network {
    tokens: Token[];
}

export class Token {
    symbol: string;
    logo: string;
    //TODO may be plain string
    contract: string | null | undefined;
    decimals: number;
    price_in_usd: number;
    precision: number;
    is_native: boolean
    group_name?: string | null;
    available_in_source?: boolean;
    available_in_destination?: boolean;
    status: string;
    //remove
    refuel_amount_in_usd?: number
}

export class Metadata {
    evm_oracle_contract?: string | null
    evm_multi_call_contract?: string | null
    listing_date: string
}