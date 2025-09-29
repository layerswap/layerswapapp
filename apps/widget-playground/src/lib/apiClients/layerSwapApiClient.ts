import { AxiosInstance, Method } from "axios";
import { NetworkWithTokens } from "@/Models/Network";
import posthog from "posthog-js";
import { InitializeAuthInstance, InitializeUnauthInstance } from "../axiosInterceptor";
import AppSettings from "../AppSettings";
import { AuthRefreshFailedError } from "../Errors/AuthRefreshFailedError";
import { ApiResponse, EmptyApiResponse } from "@/Models/ApiResponse";
import { Exchange } from "@/Models/Exchange";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static apiKey: string = AppSettings.LayerswapApiKeys[AppSettings.ApiVersion || 'mainnet'];

    _authInterceptor: AxiosInstance;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._authInterceptor = InitializeAuthInstance();
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.AuthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetRoutesAsync(direction: 'sources' | 'destinations'): Promise<ApiResponse<NetworkWithTokens[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<NetworkWithTokens[]>>("GET", `/${direction}?include_unmatched=true&include_swaps=true&include_unavailable=true`)
    }

    async GetSourceExchangesAsync(): Promise<ApiResponse<Exchange[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<Exchange[]>>("GET", `/source_exchanges`);
    }

    async GetLSNetworksAsync(): Promise<ApiResponse<NetworkWithTokens[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<NetworkWithTokens[]>>("GET", `/networks`);
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
                    posthog.capture('$exception', {
                        name: renderingError.name,
                        message: renderingError.message,
                        stack: renderingError.stack,
                        cause: renderingError.cause,
                        where: 'apiClient',
                        severity: 'error',
                    });
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
