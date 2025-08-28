
import { InitializeAuthInstance } from "../axiosInterceptor"
import axios, { AxiosInstance } from "axios";
import { ApiResponse } from "../../Models/ApiResponse";
import { EstimateFee } from "starknet";

export default class InternalApiClient {
    authInterceptor: AxiosInstance;

    constructor() {
        this.authInterceptor = InitializeAuthInstance();
    }

    async GetStarknetFee(queryParams: string, basePath: string): Promise<ApiResponse<EstimateFee>> {
        return await axios.get(`${basePath}/api/get_starknet_fee?${queryParams}`)
    }
}
