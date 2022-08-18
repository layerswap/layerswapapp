import { CurrencyExchange } from "./CurrencyExchange";

export class Currency {
    id: string;
    asset: string;
    name: string;
    order: number;
    logo_url: string;
    decimals: number;
    precision: number;
    is_enabled: boolean;
    is_erc20: boolean;
    contract?: string;
    min_amount: number;
    max_amount: number;
    off_ramp_min_amount: number;
    off_ramp_max_amount: number;
    network_id: string;
    is_default: boolean;
    price_in_usdt: number;
    fee: number;
    exchanges: CurrencyExchange[];
}