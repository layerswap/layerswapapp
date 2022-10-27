import { ApiError } from "../Models/ApiError";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, Method } from "axios";
import { NextRouter } from "next/router";
import { AuthRefreshFailedError } from "./Errors/AuthRefreshFailedError";
export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    _authInterceptor: AxiosInstance;
    constructor(private readonly _router?: NextRouter, private readonly _redirect?: string) {
        this._authInterceptor = InitializeInstance();
    }

    fetcher = url => this._authInterceptor.get(url).then(r => r.data)

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/api/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams): Promise<CreateSwapResponse> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<CreateSwapResponse>("POST", `/swaps`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }
    async getSwaps(page: number): Promise<SwapListResponse> {
        return await this.AuthenticatedRequest<SwapListResponse>("GET", `/swaps?page=${page}`);
    }

    async getPendingSwaps(): Promise<SwapListResponse> {
        return await this.AuthenticatedRequest<SwapListResponse>("GET", `/swaps?status=1`);
    }
    async CancelSwap(swapid: string): Promise<ConnectResponse> {
        return await this.AuthenticatedRequest<ConnectResponse>("DELETE", `/swaps/${swapid}`);
    }

    async getSwapDetails(id: string): Promise<SwapItemResponse> {
        return await this.AuthenticatedRequest<SwapItemResponse>("GET", `/swaps/${id}`);
    }

    async GetExchangeAccounts(): Promise<UserExchangesResponse> {
        return await this.AuthenticatedRequest<UserExchangesResponse>("GET", '/exchange_accounts');
    }

    async GetExchangeDepositAddress(exchange: string, currency: string): Promise<ExchangeDepositAddressReponse> {
        return await this.AuthenticatedRequest<ExchangeDepositAddressReponse>("GET", `/exchange_accounts/${exchange}/deposit_address/${currency}`);
    }
    async DeleteExchange(exchange: string): Promise<ConnectResponse> {
        return await this.AuthenticatedRequest<ConnectResponse>("DELETE", `/exchange_accounts/${exchange}`);
    }
    async ConnectExchangeApiKeys(params: ConnectParams): Promise<ConnectResponse> {
        return await this.AuthenticatedRequest<ConnectResponse>("POST", '/exchange_accounts', params);
    }

    async ProcessPayment(id: string, twoFactorCode?: string): Promise<PaymentProcessreponse> {
        return await this.AuthenticatedRequest<PaymentProcessreponse>("POST", `/swaps/${id}/initiate${twoFactorCode ? `?confirmationCode=${twoFactorCode}` : ''}`);
    }

    private async AuthenticatedRequest<T>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api" + endpoint;
        return await this._authInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                if (res.data) {
                    return res.data;
                }
                else {
                    throw new Error("API response data is missing");
                }
            })
            .catch(async reason => {
                if (reason instanceof AuthRefreshFailedError) {
                    this._router && await this._router.push({
                        pathname: '/auth',
                        query: { redirect: this._redirect }
                    });

                    return Promise.reject();
                }

                return Promise.reject(reason);
            });
    }
}

export type CreateSwapParams = {
    amount: number,
    network: string,
    exchange: string,
    asset: string,
    destination_address: string,
    partner?: string,
    type: number,
    external_id?: string,
}

export type SwapItemResponse = {
    data: SwapItem,
    error: ApiError,
}

export type SwapListResponse = {
    data: SwapItem[],
    error: ApiError,
}

export type SwapItem = {
    id: string,
    requested_amount: number,
    received_amount: number,
    created_date: string,
    fee: number,
    status: SwapStatus,
    type: SwapType,
    destination_address: string,
    message: string,
    transaction_id: string,
    partner_id: string,
    network_currency_id: string,
    exchange_currency_id: string,
    additonal_data: {
        deposit_address: string,
        chain_display_name: string,
        current_withdrawal_fee: number,
        withdrawal_amount: number,
        note: string,
        memo?: string,
        payment_url: string,
    }
}

export enum SwapType {
    OnRamp = "cex_to_network",
    OffRamp = "network_to_cex",
}

export type Payment = {
    id: string,
    status: 'completed' | 'closed' | 'processing' | "created" | "expired",
    close_reason: string,
    flow: string,
    amount: number,
    currency: string,
    exchange: string,
    message: string,
    withdrawal_fee: number,
    manual_flow_context?: {
        current_withdrawal_fee: number,
        require_select_internal: boolean,
        display_network: boolean,
        is_fee_refundable: boolean,
        has_memo: boolean,
        address: string,
        memo: string,
        network_display_name: string,
        withdrawal_fee: number,
        withdrawal_amount: number,
        total_withdrawal_amount: number,
        note: string,
        require_note: boolean
    },
    sequence_number: string,
}


export type PaymentProcessreponse = {
    error: string
}

export type ExchangeDepositAddressReponse = {
    data: string,
    error: ApiError
}


export type ConnectParams = {
    api_key: string,
    api_secret: string,
    keyphrase?: string,
    exchange: string
}

export type ConnectResponse = {
    request_id: string,
    error: ApiError
}


export interface UserExchangesResponse {
    data: [
        {
            exchange_id: string,
            note: string
        }
    ],
    error: ApiError
}


type CreateSwapResponse = {
    data: {
        swap_id: string
    },
    error: ApiError
}



