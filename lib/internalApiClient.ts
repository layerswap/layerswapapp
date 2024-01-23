
import { InitializeInstance } from "./axiosInterceptor"
import axios, { AxiosInstance } from "axios";
import { ApiResponse } from "../Models/ApiResponse";
import TokenService from "./TokenService";
import { EstimateFee } from "starknet";

export default class InternalApiClient {
    authInterceptor: AxiosInstance;

    constructor() {
        this.authInterceptor = InitializeInstance();
    }

    async VerifyWallet(queryParams: string): Promise<ApiResponse<void>> {
        let token = TokenService.getAuthData()?.access_token;
        return await this.authInterceptor(`/api/network_account${queryParams}`, { method: "GET", headers: { 'Access-Control-Allow-Origin': '*', "Authorization": `Bearer ${token}` } });
    }

    async GetStarknetFee(queryParams: string, basePath: string): Promise<ApiResponse<EstimateFee>> {
        return await axios.get(`${basePath}/api/get_starknet_fee?${queryParams}`)
    }
}
