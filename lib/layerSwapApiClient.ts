import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, Method } from "axios";
import { NextRouter } from "next/router";
import { AuthRefreshFailedError } from "./Errors/AuthRefreshFailedError";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    _authInterceptor: AxiosInstance;
    constructor(private readonly _router?: NextRouter, private readonly _redirect?: string) {
        this._authInterceptor = InitializeInstance(LayerSwapApiClient.apiBaseEndpoint);
    }

    fetcher = (url: string) => {
        console.log("blah blah")
        return this.AuthenticatedRequest<ApiResponse<any>>("GET", url)
    }

    async GetSettingsAsync(): Promise<ApiResponse<LayerSwapSettings>> {
        return await axios.get(LayerSwapApiClient.apiBaseEndpoint + '/api/settings').then(res => res.data);
    }

    async CreateSwapAsync(params: CreateSwapParams): Promise<ApiResponse<CreateSwapData>> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<ApiResponse<CreateSwapData>>("POST", `/swaps`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }

    async GetSwapsAsync(page: number): Promise<ApiResponse<SwapItem[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem[]>>("GET", `/swaps?page=${page}`);
    }

    async GetPendingSwapsAsync(): Promise<ApiResponse<SwapItem[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem[]>>("GET", `/swaps?status=1`);
    }

    async CancelSwapAsync(swapid: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/swaps/${swapid}`);
    }

    async GetSwapDetailsAsync(id: string): Promise<ApiResponse<SwapItem>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem>>("GET", `/swaps/${id}`);
    }

    async GetExchangeAccounts(): Promise<ApiResponse<UserExchangesData[]>> {
        return await this.AuthenticatedRequest<ApiResponse<UserExchangesData[]>>("GET", '/exchange_accounts');
    }

    async GetExchangeDepositAddress(exchange: string, currency: string): Promise<ApiResponse<string>> {
        return await this.AuthenticatedRequest<ApiResponse<string>>("GET", `/exchange_accounts/${exchange}/deposit_address/${currency}`);
    }
    async DeleteExchange(exchange: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/exchange_accounts/${exchange}`);
    }
    async ConnectExchangeApiKeys(params: ConnectParams): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", '/exchange_accounts', params);
    }

    async ProcessPayment(id: string, twoFactorCode?: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/swaps/${id}/initiate${twoFactorCode ? `?confirmationCode=${twoFactorCode}` : ''}`);
    }

    async GetNetworkAccount(networkName: string, address: string): Promise<ApiResponse<NetworkAccount>> {
        return await this.AuthenticatedRequest<ApiResponse<NetworkAccount>>("GET", `/network_accounts/${networkName}/${address}`);
    }

    async GetNetworkAccounts(networkName: string): Promise<ApiResponse<NetworkAccount[]>> {
        return await this.AuthenticatedRequest<ApiResponse<NetworkAccount[]>>("GET", `/network_accounts/${networkName}`);
    }

    async CreateNetworkAccount(params: NetworkAccountParams): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/network_accounts`, params);
    }

    async ApplyNetworkInput(swapId: string, transactionId: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/swaps/${swapId}/apply_network_input`, { transaction_id: transactionId });
    }

    private async AuthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api" + endpoint;
        return await this._authInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                return res?.data;
            })
            .catch(async reason => {
                if (reason instanceof AuthRefreshFailedError) {
                    this._router && (await this._router.push({
                        pathname: '/auth',
                        query: { redirect: this._redirect }
                    }));

                    return Promise.resolve(new EmptyApiResponse({ message: "Login required", code: "" }));
                }
                else {
                    return Promise.reject(reason);
                }
            });
    }
}

type NetworkAccountParams = {
    address: string,
    network: string,
    note: string,
    signature: string
}

export type NetworkAccount = {
    id: string,
    address: string,
    note: string,
    network_id: string,
    network: string
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

export type ConnectParams = {
    api_key: string,
    api_secret: string,
    keyphrase?: string,
    exchange: string
}

export type UserExchangesData = {
    exchange_id: string,
    note: string
}

export type CreateSwapData = {
    swap_id: string
}