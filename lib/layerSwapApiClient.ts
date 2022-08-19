import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import authInterceptor from "./axiosInterceptor"

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    apiFetcher = (url: string) => authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams, token: string): Promise<CreateSwapResponse> {
        return await authInterceptor.post(LayerSwapApiClient.apiBaseEndpoint + '/swaps',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwaps(page: number, token: string): Promise<SwapListResponse> {
        return await authInterceptor.get(LayerSwapApiClient.apiBaseEndpoint + `/swaps?page=${page}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwapDetails(id: string, token: string): Promise<SwapItemResponse> {
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
    destination_address: string,
    to_exchange: boolean,
}


export type SwapItemResponse = {
    data: SwapItem,
    error: string,
    is_success: boolean
}

export type SwapListResponse = {
    data: SwapItem[],
    error: string,
    is_success: boolean
}
export type SwapItem = {
    id: string,
    amount: number,
    fee: number,
    status: SwapStatus,
    exchange: string,
    type: "off_ramp" | "on_ramp",
    destination_address: string,
    external_payment_id: string,
    payment?: Payment,
    external_payout_id: string,
    message: string,
    transaction_id: string,
    created_date: Date,
    currency: string,
    currency_id: string,
    network: string,
    network_id: string,
    offramp_info: {
        deposit_address: string,
        memo: string,
    }
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

type CreateSwapResponse = {
    data: {
        swap_id: string
    },
    is_success: boolean,
    error: string
}



