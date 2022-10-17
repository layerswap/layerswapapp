import { ApiError } from "../Models/ApiError";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from "axios";
import { NextRouter } from "next/router";
export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    authInterceptor: AxiosInstance;
    constructor(router?: NextRouter, redirect?: string) {
        this.authInterceptor = InitializeInstance(router, redirect);
    }

    fetcher = url => this.authInterceptor.get(url).then(r => r.data)

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/api/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams): Promise<CreateSwapResponse> {
        const correlationId = uuidv4()
        return await this.authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + '/api/swaps',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', 'X-LS-CORRELATION-ID': correlationId} })
            .then(res => res.data);
    }
    async getSwaps(page: number): Promise<SwapListResponse> {
        return await this.authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps?page=${page}`,
            { headers: { 'Access-Control-Allow-Origin': '*'} })
            .then(res => res.data);
    }
    async getPendingSwaps(): Promise<SwapListResponse> {
        return await this.authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps?status=1`,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data);
    }
    async CancelSwap(swapid: string): Promise<ConnectResponse> {
        return await this.authInterceptor.delete(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps/${swapid}`,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data)
    }
    async getSwapDetails(id: string): Promise<SwapItemResponse> {
        return await this.authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps/${id}`,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data);
    }
    async GetExchangeAccounts(): Promise<UserExchangesResponse> {
        return await this.authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + '/api/exchange_accounts')
            .then(res => res.data)
    }
    async GetExchangeDepositAddress(exchange: string, currency: string): Promise<ExchangeDepositAddressReponse> {
        return await this.authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/exchange_accounts/${exchange}/deposit_address/${currency}`,
            { headers: { 'Access-Control-Allow-Origin': '*'} })
            .then(res => res.data)
    }
    async DeleteExchange(exchange: string): Promise<ConnectResponse> {
        return await this.authInterceptor.delete(LayerSwapApiClient.apiBaseEndpoint + `/api/exchange_accounts/${exchange}`,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data)
    }
    async ConnectExchangeApiKeys(params: ConnectParams): Promise<ConnectResponse> {
        return await this.authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data)
    }
    async ProcessPayment(id: string, twoFactorCode?: string): Promise<PaymentProcessreponse> {
        return await this.authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps/${id}/initiate${twoFactorCode ? `?confirmationCode=${twoFactorCode}` : ''}`,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data)
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
    external_transaction_id?: string,
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



