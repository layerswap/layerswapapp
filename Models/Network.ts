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
    chain_id: string;
    node_url: string;
    type: NetworkType;
    transaction_explorer_template: string;
    account_explorer_template: string;
    metadata: Metadata | null | undefined;
}

export class CryptoNetwork extends Network {
    tokens: Token[];
}

export class Token {
    symbol: string;
    logo: string;
    //TODO may be plain string
    contract: `0x${string}` | null | undefined;
    decimals: number;
    price_in_usd: number;
    precision: number;
    is_native: boolean
    group_name?: string | null;
    available_in_source?: boolean;
    available_in_destination?: boolean;
}

export class ManagedAccount {
    address: `0x${string}`;
}
export class Metadata {
    multicall3?: {
        address: `0x${string}`
        blockCreated: number
    }
    ensRegistry?: {
        address: `0x${string}`
    }
    ensUniversalResolver?: {
        address: `0x${string}`
    }
    GasPriceOracleContract?: `0x${string}`
    WatchdogContractAddress?: `0x${string}`
    L1Network?: string
}