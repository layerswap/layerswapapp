
import { InitializeInstance } from "./axiosInterceptor"
import { AxiosInstance } from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import LayerSwapAuthApiClient from "./userAuthApiClient";
import TokenService from "./TokenService";

export default class InternalApiClient {
    authInterceptor: AxiosInstance;

    constructor() {
        this.authInterceptor = InitializeInstance();
    }

    async VerifyWallet(queryParams: string): Promise<ApiResponse<void>> {
        let token = TokenService.getAuthData()?.access_token;
        return await this.authInterceptor(`/api/network_account${queryParams}`, { method: "GET", headers: { 'Access-Control-Allow-Origin': '*', "Authorization": `Bearer ${token}` } });
    }
}
