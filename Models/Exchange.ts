import { NetworkCurrency } from "./CryptoNetwork";
import { LayerStatus } from "./Layer";

export class Exchange {
    display_name: string;
    internal_name: string;
    authorization_flow: "o_auth2" | "api_credentials" | 'none'
    currencies: (ExchangeCurrency & NetworkCurrency)[];
    status: LayerStatus;
    metadata?: ExchangeMetadata;
    type: "cex" | "fiat";
    is_featured: boolean;
    nodes: NetworkNodes[];
}

export class ExchangeCurrency {
    asset: string;
    withdrawal_fee: number;
    min_deposit_amount: number;
    network: string;
    is_default: boolean;
    status: LayerStatus
}
export class ExchangeMetadata {
    alchemy_network_name: string;
    alchemy_webhook_secret: string;
    all_time_average_gas_price_in_wei: string;
}

export class NetworkNodes {
    url: string;
}