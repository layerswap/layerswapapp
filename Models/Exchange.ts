import { CurrencyDetails } from "./Currency";

export class Exchange {
    display_name: string;
    internal_name: string;
    currencies: {
        asset: string,
        precision: number,
        withdrawal_fee: number,
        chain_display_name: string,
        chain_internal_name: string,
        is_default: boolean,
        is_enabled: boolean
    }[];
}