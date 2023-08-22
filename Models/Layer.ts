import { CryptoNetwork, NetworkAddressType } from "./CryptoNetwork";

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
    assets?: ExchangeL2Asset[];
    type: "cex" | "fiat",
    authorization_flow: "o_auth2" | "api_credentials" | 'none';
} | {
    isExchange: false;
    assets?: BaseL2Asset[];
    native_currency?: string;
    average_completion_time?: string;
    chain_id?: string;
    address_type?: NetworkAddressType
})

export type BaseL2Asset = {
    asset: string;
    network_internal_name: string;
    network: CryptoNetwork;
    is_default: boolean;
    status: LayerStatus;
    contract_address?: string;
    decimals?: number
}

export type ExchangeL2Asset = {
    withdrawal_fee: number;
    min_deposit_amount: number;
} & BaseL2Asset