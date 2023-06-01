import { NetworkCurrency } from "./CryptoNetwork";
import { LayerStatus } from "./Layer";

export class Exchange {
    display_name: string;
    internal_name: string;
    authorization_flow: "o_auth2" | "api_credentials" | 'none'
    currencies: (ExchangeCurrency & NetworkCurrency)[];
    status: LayerStatus;
    type: "cex" | "fiat"
}

export class ExchangeCurrency {
    asset: string;
    withdrawal_fee: number;
    min_deposit_amount: number;
    network: string;
    is_default: boolean;
    status: LayerStatus
}