import { CurrencyDetails } from "./Currency";

export class Exchange {
    id: string;
    display_name: string;
    is_network_required: boolean;
    is_fee_refundable: boolean;
    deposit_flow: string;///TODO clarify statuses and create enum
    require_memo: boolean;
    o_auth_authorization_url: string;
    currencies: CurrencyDetails[];
    order: number;
    fee_in_usd: number;
    logo_url: string;
    internal_name: string;
    is_enabled: boolean;
    is_default: boolean;
    authorization_flow: "o_auth2" | "api_credentials" | "none" | null;
    oauth_login_redirect_url: string;
    has_keyphrase: boolean;
}