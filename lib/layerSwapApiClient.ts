import axios from "axios";
import { Exchange } from "../Models/Exchange";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import authInterceptor from "./axiosInterceptor"

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = "https://layerswap-core-functions-6.azurewebsites.net/api"; // "http://localhost:7071/api";

    apiFetcher = (url: string) => authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams, token: string): Promise<CreateSwapFailedResponse | CreateSwapSuccessResponse> {
        return await authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + '/swaps',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwaps(page: number, token: string): Promise<Swap[]> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/swaps?page=${page}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwapDetails(id: string, token: string): Promise<SwapDetailsResponse> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/swaps/${id}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
}

export type CreateSwapParams = {
    Amount: number,
    Network: string,
    Exchange: string,
    currency: string,
    destination_address: string
}

export type Swap = {
    "id": string,
    "amount": number,
    "status": SwapStatus,
    "type": string,
    "destination_address": string,
    "external_payment_id": string,
    "external_payout_id": string,
    "message": string,
    "transaction_id": string,
    "created_date": Date,
    "currency": string,
    "network": string,
    "exchange": string,
    "offramp_info": string
}

export type SwapDetailsResponse = {
    id: string,
    amount: number,
    status: SwapStatus,
    exchange: string,
    type: string,
    destination_address: string,
    external_payment_id: string,
    payment?: Payment,
    external_payout_id: string,
    message: string,
    transaction_id: string,
    created_date: Date,
    currency: string,
    network: string,
    offramp_info: string
}

export type Payment = {
    id: string,
    status: 'completed' | 'closed' | 'processing' | "created",
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
    external_flow_context: {
        payment_url: string;
    },
    sequence_number: string,
}

type CreateSwapSuccessResponse = {
    value: {
        swap_id: string
    },
    statusCode: 200
}

type CreateSwapFailedResponse = {
    value: string,
    statusCode: 500 | 400
}


