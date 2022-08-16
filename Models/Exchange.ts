export class Exchange {
    id: string;
    name: string;
    order: number;
    logo_url: string;
    internal_name: string;
    is_enabled: boolean;
    is_default: boolean;
    fee_percentage: number;
    authorization_flow: "o_auth2" | "api_credentials" | "none" | null;
    oauth_authorization_redirect_url: string;
    has_keyphrase:boolean;
    keyphrase_display_name:string;
    transaction_explorer_template: string;
    account_explorer_template: string
}