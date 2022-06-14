import axios from "axios";
import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = "https://api2.layerswap.io";

    apiFetcher = (url: string) => axios.get(LayerSwapApiClient.apiBaseEndpoint + url).then(res => res.data);

    async fetchSettingsAsync(): Promise<LayerSwapSettings> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/settings').then(res => res.data);
    }

    async createSwap(params: CreateSwapParams, token: string): Promise<CreateSwapFailedResponse | CreateSwapSuccessResponse> {
        return await axios.post(LayerSwapApiClient.apiBaseEndpoint + '/swaps',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data);
    }
    async getSwapDetails(id: string, token: string): Promise<SwapDetailsResponse> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + `/swaps/${id}`,
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

export type SwapDetailsResponse = {
    id: string,
    amount: number,
    status: SwapStatus,
    type: string,
    destination_address: string,
    external_payment_id: string,
    external_payout_id: string,
    message: string,
    transaction_id: string,
    created_date: Date,
    currency: string,
    network: string,
    offramp_info: string
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


