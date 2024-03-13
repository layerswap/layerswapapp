import { Metadata, Token, NetworkType } from "./Network";

export type LayerStatus = "active" | "inactive" | 'insufficient_liquidity';
export type Layer = {
    display_name: string;
    name: string;
    is_featured: boolean;
    created_date: string;   
    logo: string;
    metadata: Metadata | null | undefined;
    tokens: Token[];
    chain_id: string | null | undefined;
    transaction_explorer_template: string | null
    account_explorer_template: string,
    type: NetworkType,
    node_url: string
}

export type NetworkNodes = {
    url: string;
}