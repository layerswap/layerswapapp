import axios from "axios";
import { AuthGetCodeResponse, AuthConnectResponse } from "../Models/LayerSwapAuth";


export class BransferApiClient {
    static apiBaseEndpoint: string = "https://localhost:5069";

    async GetExchangeAccounts(params: ConnectParams): Promise<AuthGetCodeResponse> {
        return await axios.post(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data);
    }

    async ConnectExchangeApiKeys(params: ConnectParams): Promise<AuthGetCodeResponse> {
        return await axios.post(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*' } })
            .then(res => res.data);
    }
}


export type ConnectParams = {
    key: string,
    secret: string,
    exchange: string
}