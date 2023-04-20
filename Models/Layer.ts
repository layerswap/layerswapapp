import { CryptoNetwork } from "./CryptoNetwork";

export type Layer = {
    display_name: string;
    internal_name: string;
    status: "active" | "inactive" | 'insufficient_liquidity';
} & LayerData

type LayerData = ({
    isExchange: true;
    layer2Assets?: ExchangeL2Asset[];
    oauth_connect_url: string;
    oauth_authorize_url: string;
    authorization_flow: "o_auth2" | "api_credentials" | 'none';
} | {
    isExchange: false;
    layer2Assets?: BaseL2Asset[];
})

export type BaseL2Asset = {
    asset: string;
    network_internal_name: string;
    network: CryptoNetwork;
    is_default: boolean;
}

export type ExchangeL2Asset = {
    withdrawal_fee: number;
    min_deposit_amount: number;
} & BaseL2Asset