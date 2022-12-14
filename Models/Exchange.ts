
export class Exchange {
    display_name: string;
    internal_name: string;
    currencies: ExchangeCurrency[];
}

export class ExchangeCurrency {
    asset: string;
    withdrawal_fee: number;
    chain_display_name: string;
    network: string;
}