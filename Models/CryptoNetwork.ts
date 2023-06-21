import { LayerStatus } from "./Layer";

export enum NetworkAddressType {
    "evm" = "evm",
    'starknet' = "starknet",
    'solana' = "solana",
    'osmosis' = "osmosis",
    'immutable_x' = "immutable_x",
    'loopring' = "loopring"
}

export class CryptoNetwork {
    display_name: string;
    internal_name: string;
    native_currency: string;
    average_completion_time: string;
    fee_multiplier: number;
    transaction_explorer_template: string;
    status: LayerStatus;
    currencies: NetworkCurrency[];
    refuel_amount_in_usd: number;
    chain_id: string;
    address_type: NetworkAddressType
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
    base_fee: number;
}