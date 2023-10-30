import { CryptoNetwork, Metadata, NetworkType } from "./CryptoNetwork";

export type LayerStatus = "active" | "inactive" | 'insufficient_liquidity';
export type Layer = {
    display_name: string;
    internal_name: string;
    status: LayerStatus;
    is_featured: boolean;
    created_date: string;
} & LayerData

type LayerData = ({
    isExchange: true;
    assets?: ExchangeAsset[];
    type: "cex" | "fiat",
    authorization_flow: "o_auth2" | "api_credentials" | 'none';
} | {
    isExchange: false;
    assets: NetworkAsset[];
    native_currency: string | null | undefined;
    average_completion_time: string;
    chain_id: string | null | undefined;
    type: NetworkType,
    metadata: Metadata | null | undefined;
    nodes: NetworkNodes[];
})

export type BaseL2Asset = {
    asset: string;
    network_internal_name: string;
    network?: CryptoNetwork;
    is_default: boolean;
    status: LayerStatus;
}

export type ExchangeAsset = {
    withdrawal_fee: number;
    min_deposit_amount: number;
} & BaseL2Asset

export type NetworkAsset = {
    contract_address?: `0x${string}` | null | undefined
    decimals: number
} & BaseL2Asset

export type NetworkNodes = {
    url: string;
}