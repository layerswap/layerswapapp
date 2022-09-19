import { CurrencyDetails } from "./Currency";

export class Exchange {
    id: string;
    display_name: string;
    is_network_required: boolean;
    is_fee_refundable: boolean;
    deposit_flow: string;///TODO clarify statuses and create enum
    require_memo: boolean;
    o_auth_url: string;
    currencies: CurrencyDetails[];
    order: number;
    logo_url: string;
    internal_name: string;
    is_enabled: boolean;
    is_default: boolean;
    authorization_flow: "o_auth2" | "api_credentials" | "none" | null;
    oauth_authorization_redirect_url: string;
    oauth_login_redirect_url: string
    has_keyphrase: boolean;
    keyphrase_display_name: string;
    transaction_explorer_template: string;
    account_explorer_template: string
}