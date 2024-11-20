import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeUnauthInstance, InitializeAuthInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import { AxiosInstance, Method } from "axios";
import { AuthRefreshFailedError } from "./Errors/AuthRefreshFailedError";
import { ApiResponse, CreateSwapParams, DepositAddress, DepositAddressSource, EmptyApiResponse, GetQuoteParams, Quote, SwapResponse } from "../Models/ApiResponse";
import LayerSwapAuthApiClient from "./userAuthApiClient";
import { NetworkWithTokens, Network, Token } from "../Models/Network";
import { Exchange } from "../Models/Exchange";
import { datadogRum } from '@datadog/browser-rum';

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static bridgeApiBaseEndpoint?: string = AppSettings.LayerswapBridgeApiUri;
    static apiKey: string | undefined;

    _authInterceptor: AxiosInstance;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._authInterceptor = InitializeAuthInstance(LayerSwapAuthApiClient.identityBaseEndpoint);
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.AuthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetRoutesAsync(direction: 'sources' | 'destinations'): Promise<ApiResponse<NetworkWithTokens[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<NetworkWithTokens[]>>("GET", `/${direction}?include_unmatched=true&include_swaps=true&include_unavailable=true`)
    }

    async GetSourceExchangesAsync(): Promise<ApiResponse<Exchange[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<Exchange[]>>("GET", `/source_exchanges`);
    }
    async GetDestinationExchangesAsync(): Promise<ApiResponse<Exchange[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<Exchange[]>>("GET", `/destination_exchanges`);
    }

    async GetLSNetworksAsync(): Promise<ApiResponse<NetworkWithTokens[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<NetworkWithTokens[]>>("GET", `/networks`);
    }

    async CreateSwapAsync(params: CreateSwapParams): Promise<ApiResponse<SwapResponse>> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("POST", `/swaps`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }

    async GetSwapsAsync(page: number, include_expired: boolean): Promise<ApiResponse<SwapResponse[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse[]>>("GET", `/internal/swaps?page=${page}&include_expired=${include_expired}`);
    }

    async GetQuote({ params }: { params: GetQuoteParams }): Promise<ApiResponse<Quote>> {
        const { source_network, source_token, source_address, destination_token, destination_network, amount, use_deposit_address, include_gas, refuel } = params
        return await this.AuthenticatedRequest<ApiResponse<Quote>>("GET", `/quote?source_network=${source_network}&source_token=${source_token}&source_address=${source_address}&destination_network=${destination_network}&destination_token=${destination_token}&use_deposit_address=${use_deposit_address}&include_gas=${include_gas}&amount=${amount}&refuel=${refuel}`);
    }

    async DisconnectExchangeAsync(swapid: string, exchangeName: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/internal/swaps/${swapid}/exchange/${exchangeName}/disconnect`);
    }

    async GetSwapDetailsAsync(id: string): Promise<ApiResponse<SwapResponse>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("GET", `/swaps/${id}`);
    }

    async GetDepositAddress(network: string, source: DepositAddressSource): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<DepositAddress>>("GET", `/internal/swaps?network=${network}&source=${source}`);
    }

    async WithdrawFromExchange(swapId: string, exchange: string, twoFactorCode?: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/internal/swaps/${swapId}/exchange/${exchange}/withdraw${twoFactorCode ? `?twoFactorCode=${twoFactorCode}` : ''}`);
    }

    async SwapsMigration(GuestAuthorization: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/internal/swaps/migrate`, null, { GuestAuthorization });
    }

    async GetTransactionStatus(network: string, tx_id: string): Promise<ApiResponse<any>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("POST", `/internal/networks/${network}/transaction_status`, { transaction_id: tx_id });
    }

    private async AuthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v2" + endpoint;
        return await this._authInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                return res?.data;
            })
            .catch(async reason => {
                if (reason instanceof AuthRefreshFailedError) {
                    return Promise.resolve(new EmptyApiResponse());
                }
                else {
                    const renderingError = new Error(`API request error with uri:${uri}`);
                    renderingError.name = `APIError`;
                    renderingError.cause = reason;
                    datadogRum.addError(renderingError);
                    return Promise.reject(reason);
                }
            });
    }

    private async UnauthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v2" + endpoint;
        return await this._unauthInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
            .then(res => {
                return res?.data;
            })
            .catch(async reason => {
                if (reason instanceof AuthRefreshFailedError) {
                    return Promise.resolve(new EmptyApiResponse());
                }
                else {
                    return Promise.reject(reason);
                }
            });
    }
}
