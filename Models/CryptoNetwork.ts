
export class CryptoNetwork {
    display_name: string;
    internal_name: string;
    native_currency: string;
    fee_multiplier: number;
    transaction_explorer_template: string;
    status: "active" | "inactive" | string;
    currencies: NetworkCurrency[];
    refuel_amount_in_usd: number;
}

export class NetworkCurrency {
    asset: string;
    status: "active" | "insufficient_liquidity";
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