import axios from "axios";
import { AuthGetCodeResponse, AuthConnectResponse } from "../Models/LayerSwapAuth";


export class BransferApiClient {
    static apiBaseEndpoint: string = "https://localhost:5069";

    async GetExchangeAccounts(token: string): Promise<ExchangesResponse> {
        return await axios.get(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data)
    }

    async ConnectExchangeApiKeys(params: ConnectParams, token: string): Promise<ConnectResponse> {
        return await axios.post(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data)
    }
}

export type ConnectParams = {
    api_key: string,
    api_secret: string,
    exchange: string
}

export type ConnectResponse = {
    is_success: boolean,
    request_id: string,
    errors: [
        {
            code: string,
            message: string
        }
    ]
}


export interface ExchangesResponse {
    data?: (DataEntity)[] | null;
    is_success: boolean;
    request_id: string;
    errors?: (ErrorsEntity)[] | null;
}
export interface DataEntity {
    is_enabled: boolean;
    is_refreshable: boolean;
    last_refresh_date: string;
    api_key: string;
    api_secret: string;
    keyphrase: string;
    access_token: string;
    refresh_token: string;
    user_id: string;
    exchange_id: string;
    user: User;
    exchange: Exchange;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface User {
    first_name: string;
    last_name: string;
    registration_date: string;
    last_verification_code_sent_date: string;
    email_notification_enabled: boolean;
    payments?: (PaymentsEntity)[] | null;
    user_exchange_accounts?: (null)[] | null;
    applications?: (ApplicationOrApplicationsEntity)[] | null;
    id: string;
    user_name: string;
    normalized_user_name: string;
    email: string;
    normalized_email: string;
    email_confirmed: boolean;
    password_hash: string;
    security_stamp: string;
    concurrency_stamp: string;
    phone_number: string;
    phone_number_confirmed: boolean;
    two_factor_enabled: boolean;
    lockout_end: string;
    lockout_enabled: boolean;
    access_failed_count: number;
}
export interface PaymentsEntity {
    sequence_number: number;
    amount: number;
    received_amount: number;
    external_fee_amount: number;
    close_date: string;
    paying_currency_id: string;
    exchange_rate: number;
    status: string;
    close_reason: string;
    metadata: string;
    details: string;
    message: string;
    redirect_url: string;
    external_payment_id: string;
    external_user_id: string;
    comment: string;
    notification_url: string;
    user_id: string;
    application_id: string;
    application: ApplicationOrApplicationsEntity;
    paying_currency: CurrenciesEntityOrPayingCurrency;
    charges?: (ChargesEntity)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface ApplicationOrApplicationsEntity {
    is_featured: boolean;
    name: string;
    display_name: string;
    description: string;
    site_url: string;
    logo_url: string;
    allow_direct_pay: boolean;
    email_notification_enabled: boolean;
    allow_underpay: boolean;
    is_deleted: boolean;
    detailed_view: boolean;
    user_id: string;
    allowed_currencies?: (AllowedCurrenciesEntity)[] | null;
    exchange_accounts?: (ExchangeAccountsEntity)[] | null;
    payments?: (null)[] | null;
    webhooks?: (WebhooksEntity)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface AllowedCurrenciesEntity {
    is_enabled: boolean;
    application_id: string;
    currency_id: string;
    currency: Currency;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface Currency {
    name: string;
    asset: string;
    color: string;
    logo_url: string;
    is_shitcoin: boolean;
    decimals: number;
    usdt_price: number;
    status: string;
    average_confirmation_time: string;
    exchanges?: (null)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface ExchangeAccountsEntity {
    api_key: string;
    api_secret: string;
    keyphrase: string;
    email: string;
    is_enabled: boolean;
    exchange_id: string;
    application_id: string;
    exchange: Exchange;
    deposit_wallets?: (DepositWalletsEntity)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface Exchange {
    display_name: string;
    internal_name: string;
    description: string;
    color: string;
    logo_url: string;
    homepage_url: string;
    withdrawal_page_url: string;
    api_key_page_url: string;
    user_api_key_guide_url: string;
    user_withdrawal_guide_url: string;
    is_default: boolean;
    is_enabled: boolean;
    has_keyphrase: boolean;
    has_transaction_history: boolean;
    has_balances: boolean;
    require_email: boolean;
    display_network: boolean;
    keyphrase_display_name: string;
    require_user_authorize: boolean;
    require_ip_whitelist: boolean;
    require_select_internal: boolean;
    is_fee_refundable: boolean;
    supports_redirect: boolean;
    ip_whitelist_separator: string;
    authorization_note: string;
    withdrawal_warning_message: string;
    authorization_flow: string;
    payment_flow: string;
    currencies?: (CurrenciesEntityOrPayingCurrency)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface CurrenciesEntityOrPayingCurrency {
    exchange_id: string;
    has_memo: boolean;
    asset: string;
    network: string;
    network_display_name: string;
    precision: number;
    min_withdrawal: number;
    deposits_disabled: boolean;
    withdrawals_disabled: boolean;
    current_withdrawal_fee: number;
    currency_id: string;
    currency: Currency;
    deposit_wallets?: (DepositWalletsEntity)[] | null;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface DepositWalletsEntity {
    address: string;
    memo: string;
    network: string;
    is_enabled: boolean;
    exchange_currency_id: string;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface WebhooksEntity {
    public_key: string;
    private_key: string;
    application_id: string;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface ChargesEntity {
    transaction_id: string;
    exchange_internal_name: string;
    metadata: string;
    amount: number;
    payment_id: string;
    id: string;
    created_date: string;
    concurrency_token: number;
}
export interface ErrorsEntity {
    code: string;
    message: string;
}
