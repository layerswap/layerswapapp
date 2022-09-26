import { ApiError } from "../Models/ApiError";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import authInterceptor from "./axiosInterceptor"

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    apiFetcher = (url: string) => authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + '/api/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams, token: string): Promise<CreateSwapResponse> {
        return await authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + '/api/swaps',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwaps(page: number, token: string): Promise<SwapListResponse> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps?page=${page}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwapDetails(id: string, token: string): Promise<SwapItemResponse> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/api/swaps/${id}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
}

export type CreateSwapParams = {
    amount: number,
    network: string,
    exchange: string,
    asset: string,
    destination_address: string,
    partner?: string,
    type: SwapType,
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

type CreateSwapResponse = {
    data: {
        swap_id: string
    },
    is_success: boolean,
    error: string
}



