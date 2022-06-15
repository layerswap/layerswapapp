import axios from "axios";
import authInterceptor from "./axiosInterceptor"


export class BransferApiClient {
    static apiBaseEndpoint: string = "https://bransfer-connect-api-dev.azurewebsites.net"; //"https://localhost:5069";

    async GetExchangeAccounts(token: string): Promise<UserExchangesResponse> {
        return await authInterceptor.get(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts')
            .then(res => res.data)
    }

    async ConnectExchangeApiKeys(params: ConnectParams, token: string): Promise<ConnectResponse> {
        return await authInterceptor.post(BransferApiClient.apiBaseEndpoint + '/api/exchange_accounts',
            params,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data)
    }

    async ProcessPayment(id: string, token: string, twoFactorCode?: string): Promise<PaymentProcessreponse> {
        return await authInterceptor.post(BransferApiClient.apiBaseEndpoint + `/api/payments/${id}/process${twoFactorCode ? `?twoFactor=${twoFactorCode}` : ''}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data)
    }

    async GetPayment(id: string, token: string): Promise<Payment> {
        return await authInterceptor.get(BransferApiClient.apiBaseEndpoint + `/api/payments/${id}`,
            { headers: { 'Access-Control-Allow-Origin': '*', Authorization: `Bearer ${token}` } })
            .then(res => res.data)
    }
}

export type PaymentProcessreponse = {
    is_success: boolean,
    request_id: string,
    errors: string
}

export type Payment = {
    data: {
        id: string,
        status: 'completed' | 'closed' | 'processing' | "created",
        close_reason: string,
        flow: string,
        amount: number,
        currency: string,
        exchange: string,
        message: string,
        manual_flow_context?: {
            require_select_internal: boolean,
            display_network: boolean,
            is_fee_refundable: boolean,
            has_memo: boolean,
            address: string,
            memo: string,
            network_display_name: string,
            withdrawal_fee: number,
            withdrawal_amount: number,
            total_withdrawal_amount: number
        },
        external_flow_context: {
            payment_url: string;
        },
        note_flow_context: {
            address: string,
            memo: string,
            has_memo: string,
            note: string,
        },
        sequence_number: string,
    },
    is_success: boolean,
    request_id: string,
    errors: string

}

export type ConnectParams = {
    api_key: string,
    api_secret: string,
    exchange: string
}

export type ConnectResponse = {
    is_success: boolean,
    request_id: string,
    errors: [
        {
            code: string,
            message: string
        }
    ]
}


export interface UserExchangesResponse {
    data: [
        {
            exchange: string,
            is_enabled: boolean,
            note: string
        }
    ],
    is_success: boolean,
    request_id: string,
    errors: string
}
