import { CurrencyDetails } from "./Currency";

export class Exchange {
    id: string;
    display_name: string;
    is_network_required: boolean;
    is_fee_refundable: boolean;
    deposit_flow: DepositFlow;
    require_memo: boolean;
    o_auth_authorization_url: string;
    currencies: CurrencyDetails[];
    order: number;
    fee_in_usd: number;
    logo: string;
    internal_name: string;
    status: "active" | string;
    is_default: boolean;
    authorization_flow: "o_auth2" | "api_credentials" | "none" | null;
    oauth_login_redirect_url: string;
    has_keyphrase: boolean;
}

export enum DepositFlow {
    Manual = "manual",
    Automatic = "automatic",
    External = "external",
}