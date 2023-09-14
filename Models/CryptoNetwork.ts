import { LayerStatus } from "./Layer";

export enum NetworkType
{
    EVM = "evm",
    Starknet = "starknet",
    Solana = "solana",
    Cosmos = "cosmos",
    StarkEx = "starkex",
    ZkSyncLite = "zksynclite",
}


export class CryptoNetwork {
    display_name: string;
    internal_name: string;
    native_currency: string;
    average_completion_time: string;
    fee_multiplier: number;
    transaction_explorer_template: string;
    account_explorer_template?: string;
    status: LayerStatus;
    currencies: NetworkCurrency[];
    refuel_amount_in_usd: number;
    chain_id: string;
    type: NetworkType;
    created_date: string;
    is_featured: boolean;
    nodes: NetworkNode[];
    managed_accounts: ManagedAccount[];
    metadata: Metadata;
}

export class NetworkCurrency {
    name: string;
    asset: string;
    status: LayerStatus;
    is_deposit_enabled: boolean;
    is_withdrawal_enabled: boolean;
    is_refuel_enabled: boolean;
    max_withdrawal_amount: number;
    deposit_fee: number;
    withdrawal_fee: number;
    contract_address: string;
    decimals: number;
    source_base_fee: number;
    destination_base_fee: number;
}
export class NetworkNode {
    url: string;
}
export class ManagedAccount {
    address: string;
}
export class Metadata {
    multicall3: {
        address: `0x${string}`
        blockCreated: number
    }
    ensRegistry?: {
        address: `0x${string}`
    }
    ensUniversalResolver?: {
        address: `0x${string}`
    }
}