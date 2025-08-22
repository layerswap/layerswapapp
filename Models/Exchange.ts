import { Network, Token } from "./Network";

export class Exchange {
    display_name: string;
    name: string;
    logo: string;
    metadata: {
        o_auth: {
            connect_url: string,
            authorize_url: string
        } | null
    }
}

export class ExchangeNetwork {
    token: Token;
    network: Network;
    fee: {
        total_fee: number;
        total_fee_in_usd: number
    }
}