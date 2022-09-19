export class Currency {
    id: string;
    asset: string;
    logo_url: string;
    usd_price:number;
}

export class CurrencyDetails {
    id: string;
    asset: string;
    order: number;
    status: "active" | string;
    deposit_method: "address" | string; //TODO clarify
    is_deposit_enabled: boolean;
    is_withdrawal_enabled: boolean;
    min_withdrawal_amount: number;
    max_withdrawal_amount: number;
    fee: number;
    fee_percentage: number;
    precision: number;
    current_withdrawal_fee: number;
}
