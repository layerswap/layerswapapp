import { ManagedAccount, Metadata, NetworkCurrency, NetworkType } from "./CryptoNetwork";

export type LayerStatus = "active" | "inactive" | 'insufficient_liquidity';
export type Layer = {
    display_name: string;
    internal_name: string;
    status: LayerStatus;
    is_featured: boolean;
    created_date: string;
    img_url: string;
    metadata: Metadata | null | undefined;
    assets: NetworkCurrency[];
    chain_id: string | null | undefined;
    refuel_amount_in_usd: number
    transaction_explorer_template: string
    account_explorer_template: string,
    type: NetworkType,
    managed_accounts: ManagedAccount[];
    nodes: NetworkNodes[];
}

export type NetworkNodes = {
    url: string;
}