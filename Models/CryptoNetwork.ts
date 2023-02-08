
export class CryptoNetwork {
    display_name: string;
    internal_name: string;
    transaction_explorer_template: string;
    status: "active" | "inactive" | string;
    currencies: NetworkCurrency[];
}

export class NetworkCurrency {
    asset: string;
    status: "active" | "insufficient_liquidity";
    is_deposit_enabled: boolean;
    is_withdrawal_enabled: boolean;
    min_withdrawal_amount: number;
    max_withdrawal_amount: number;
    fee: number
}