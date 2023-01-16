import { NetworkCurrency } from "./CryptoNetwork";

export class Exchange {
    display_name: string;
    internal_name: string;
    oauth_connect_url: string;
    oauth_authorize_url: string;
    authorization_flow: "o_auth2" | "api_credentials"
    currencies: (ExchangeCurrency & NetworkCurrency)[];
    status: "active" | "inactive"
}

export class ExchangeCurrency {
    asset: string;
    withdrawal_fee: number;
    chain_display_name: string;
    network: string;
}