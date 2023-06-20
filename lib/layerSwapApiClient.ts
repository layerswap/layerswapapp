import { LayerSwapSettings } from "../Models/LayerSwapSettings";
import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, Method } from "axios";
import { NextRouter } from "next/router";
import { AuthRefreshFailedError } from "./Errors/AuthRefreshFailedError";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";
import LayerSwapAuthApiClient from "./userAuthApiClient";
import { DepositType } from "./NetworkSettings";

export default class LayerSwapApiClient {
    static apiBaseEndpoint: string = AppSettings.LayerswapApiUri;

    _authInterceptor: AxiosInstance;
    constructor(private readonly _router?: NextRouter, private readonly _redirect?: string) {
        this._authInterceptor = InitializeInstance(LayerSwapAuthApiClient.identityBaseEndpoint);
    }

    fetcher = (url: string) => this.AuthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetSettingsAsync(): Promise<ApiResponse<LayerSwapSettings>> {
        const version = process.env.NEXT_PUBLIC_API_VERSION
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/settings?version=${version}`).then(res => res.data);
    }

    async CreateSwapAsync(params: CreateSwapParams): Promise<ApiResponse<CreateSwapData>> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<ApiResponse<CreateSwapData>>("POST", `/swaps`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }

    async GetSwapsAsync(page: number, status?: SwapStatusInNumbers): Promise<ApiResponse<SwapItem[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem[]>>("GET", `/swaps?page=${page}${status ? `&status=${status}` : ''}`);
    }


    async GetPendingSwapsAsync(): Promise<ApiResponse<SwapItem[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem[]>>("GET", `/swaps?status=0`);
    }

    async CancelSwapAsync(swapid: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/swaps/${swapid}`);
    }

    async GetSwapDetailsAsync(id: string): Promise<ApiResponse<SwapItem>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapItem>>("GET", `/swaps/${id}`);
    }

    async GetDepositAddress(network: string, source: DepositAddressSource): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<DepositAddress>>("GET", `/swaps?network=${network}&source=${source}`);
    }

    async GenerateDepositAddress(network: string): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("POST", `/deposit_addresses/${network}`);
    }

    async GetExchangeAccounts(): Promise<ApiResponse<UserExchangesData[]>> {
        return await this.AuthenticatedRequest<ApiResponse<UserExchangesData[]>>("GET", '/exchange_accounts');
    }
    async GetExchangeAccount(exchange: string, type?: number): Promise<ApiResponse<UserExchangesData>> {
        return await this.AuthenticatedRequest<ApiResponse<UserExchangesData>>("GET", `/exchange_accounts/${exchange}?type=${type || 0}`);
    }
    async GetExchangeDepositAddress(exchange: string, currency: string): Promise<ApiResponse<string>> {
        return await this.AuthenticatedRequest<ApiResponse<string>>("GET", `/exchange_accounts/${exchange}/deposit_address/${currency}`);
    }
    async DeleteExchange(exchange: string): Promise<ApiResponse<void>> {
        try {
            await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/exchange_accounts/${exchange}?type=0`);
        }
        catch (e) {
            //TODO handle types in backend
        }
        try {
            await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/exchange_accounts/${exchange}?type=1`);
        }
        catch (e) {
            //TODO handle types in backend
        }
        return
    }
    async ConnectExchangeApiKeys(params: ConnectParams): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", '/exchange_accounts', params);
    }

    async ProcessPayment(id: string, twoFactorCode?: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/swaps/${id}/initiate${twoFactorCode ? `?confirmationCode=${twoFactorCode}` : ''}`);
    }

    async GetWhitelistedAddress(networkName: string, address: string): Promise<ApiResponse<NetworkAccount>> {
        return await this.AuthenticatedRequest<ApiResponse<NetworkAccount>>("GET", `/whitelisted_addresses/${networkName}/${address}`,);
    }

    async CreateWhitelistedAddress(params: NetworkAccountParams): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/whitelisted_addresses`, params);
    }

    async WithdrawFromExchange(swapId: string, exchange: string, twoFactorCode?: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/swaps/${swapId}/exchange/${exchange}/withdraw${twoFactorCode ? `?twoFactorCode=${twoFactorCode}` : ''}`);
    }

    async SwapsMigration(GuestAuthorization: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("POST", `/swaps/migrate`, null, { GuestAuthorization });
    }

    async RewardLeaderboard(campaign: string): Promise<ApiResponse<any>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("PUT", `/campaigns/${campaign}/leaderboard`);
    }

    async GetFee(params: GetFeeParams): Promise<ApiResponse<any>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("POST", '/swaps/amount_settings', params);
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

                    return Promise.resolve(new EmptyApiResponse());
                }
                else {
                    return Promise.reject(reason);
                }
            });
    }
}

export type DepositAddress = {
    type: string
    address: string;
}

export enum DepositAddressSource {
    UserGenerated = 0,
    Managed = 1
}

type WhitelistedAddressesParams = {
    address: string,
    network: string,
    user_id: string
}

type NetworkAccountParams = {
    address: string,
    network: string,
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
    amount: string,
    source: string,
    destination: string,
    asset: string,
    source_address: string,
    destination_address: string,
    app_name?: string,
    reference_id?: string,
    refuel?: boolean,
}

export type SwapItem = {
    id: string,
    created_date: string,
    fee: number,
    status: SwapStatus,
    destination_address: string,
    requested_amount: number,
    message: string,
    reference_id: string,
    app_name: string,
    refuel_amount: number,
    refuel_price: number,
    refuel_transaction_id: string,
    source_network_asset: string,
    source_network: string,
    source_exchange: string,
    destination_network_asset: string,
    destination_network: string,
    destination_exchange: string,
    input_transaction?: Transaction,
    output_transaction?: Transaction,
    refuel_transaction?: RefuelTransaction;
    has_refuel?: boolean,
    has_sucessfull_published_tx: boolean;
    metadata?: {
        'STRIPE:SessionId': string
    },
    has_pending_deposit: boolean;
    sequence_number: number;
}

export type AddressBookItem = {
    address: string,
    date: string,
    networks: string[],
    exchanges: string[]
}

type Transaction = {
    amount: number,
    confirmations: number,
    created_date: string,
    max_confirmations: number,
    transaction_id: string,
    usd_value: number
    usd_price: number
}

type RefuelTransaction = {
    from: string,
    to: string,
    created_date: string,
    transaction_id: string,
    explorer_url: string,
    confirmations: number,
    max_confirmations: number,
    amount: number,
    usd_price: number,
    usd_value: number
}

export type Fee = {
    min_amount: number,
    max_amount: number,
    fee_amount: number,
    deposit_type: DepositType
}

type GetFeeParams = {
    source: string,
    destination: string,
    asset: string,
    refuel?: boolean
}

export enum PublishedSwapTransactionStatus {
    Pending,
    Error,
    Completed
}

export type PublishedSwapTransactions = {
    [key: string]: SwapTransaction
}


export type SwapTransaction = {
    hash: string,
    status: PublishedSwapTransactionStatus
}

export enum SwapType {
    OnRamp = "cex_to_network",
    OffRamp = "network_to_cex",
    CrossChain = "network_to_network"
}

export enum WithdrawType {
    Wallet = 'wallet',
    Manually = 'manually',
    Stripe = 'stripe',
    Coinbase = 'coinbase',
    External = 'external'
}
export type ConnectParams = {
    api_key: string,
    api_secret: string,
    keyphrase?: string,
    exchange: string
}

export type UserExchangesData = {
    id: string;
    exchange: string;
    note: string;
    type: "connect" | "authorize"
}

export type CreateSwapData = {
    swap_id: string
}

export enum SwapStatusInNumbers {
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Expired = 3,
    Delayed = 4,
    Cancelled = 5,
    SwapsWithoutCancelledAndExpired = '0&status=1&status=2&status=4'
}

export type Campaigns = {
    id: number,
    name: string,
    asset: string,
    network: string,
    percentage: number,
    start_date: string,
    end_date: string,
    reward_limit_for_period: number,
    min_payout_amount: number,
    reward_limit_period: number
}

export type Reward = {
    user_reward: {
        period_pending_amount: number,
        total_amount: number,
        total_pending_amount: number,
        position: number
    },
    next_airdrop_date: string | Date,
}

export type Leaderboard = {
    leaderboard: {
        address: string,
        amount: number,
        position: number
    }[],
    leaderboard_budget: number
}

export type RewardPayout = {
    date: string,
    transaction_id: string,
    amount: number
}