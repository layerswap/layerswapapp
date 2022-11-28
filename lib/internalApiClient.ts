import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import { AxiosInstance } from "axios";
import { ApiResponse } from "../Models/ApiResponse";

export default class InternalApiClient {
    authInterceptor: AxiosInstance;

    constructor() {
        this.authInterceptor = InitializeInstance();
    }

    async VerifyWallet(queryParams: string): Promise<ApiResponse<void>> {
        return await this.authInterceptor(`/api/network_account${queryParams}`, { method: "GET", headers: { 'Access-Control-Allow-Origin': '*', } });
    }
}
