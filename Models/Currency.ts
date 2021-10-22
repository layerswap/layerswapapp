export class Currency {
    id: string;
    asset: string;
    name: string;
    decimals: number;
    precision: number;
    is_enabled: boolean;
    is_erc20: boolean;
    contract?: string;
    min_amount: number;
    max_amount: number;
    fee: number;
    network_id: string;
    is_default: boolean;
}