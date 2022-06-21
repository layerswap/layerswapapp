export class Exchange {
    id: string;
    name: string;
    logo_url: string;
    internal_name: string;
    is_enabled: boolean;
    is_default: boolean;
    fee_percentage: number;
    authorization_flow: "o_auth2" | "api_credentials" | null;
    oauth_redirect_url: string;
}