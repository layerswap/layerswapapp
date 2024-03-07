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
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static apiVersion: string = AppSettings.ApiVersion;

    _authInterceptor: AxiosInstance;
    constructor(private readonly _router?: NextRouter, private readonly _redirect?: string) {
        this._authInterceptor = InitializeInstance(LayerSwapAuthApiClient.identityBaseEndpoint);
    }

    fetcher = (url: string) => this.AuthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetSourceRoutesAsync(): Promise<ApiResponse<{
        network: string;
        asset: string;
    }[]>> {
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/routes/sources?version=${LayerSwapApiClient.apiVersion}`).then(res => res.data);
    }

    async GetDestinationRoutesAsync(): Promise<ApiResponse<{
        network: string;
        asset: string;
    }[]>> {
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/routes/destinations?version=${LayerSwapApiClient.apiVersion}`).then(res => res.data);
    }

    async GetExchangesAsync(): Promise<ApiResponse<Exchange[]>> {
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/exchanges?version=${LayerSwapApiClient.apiVersion}`).then(res => res.data);
    }

    async GetSettingsAsync(): Promise<ApiResponse<LayerSwapSettings>> {
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/settings?version=${LayerSwapApiClient.apiVersion}`).then(res => res.data);
    }

    async GetLSNetworksAsync(): Promise<ApiResponse<CryptoNetwork[]>> {
        return await axios.get(`${LayerSwapApiClient.apiBaseEndpoint}/api/networks?version=${LayerSwapApiClient.apiVersion}`).then(res => res.data);
    }

    async CreateSwapAsync(params: CreateSwapParams): Promise<ApiResponse<SwapResponse>> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("POST", `/swaps?version=${LayerSwapApiClient.apiVersion}`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }

    async GetSwapsAsync(page: number, status?: SwapStatusInNumbers): Promise<ApiResponse<SwapResponse[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse[]>>("GET", `/swaps?page=${page}${status ? `&status=${status}` : ''}&version=${LayerSwapApiClient.apiVersion}`);
    }

    async GetPendingSwapsAsync(): Promise<ApiResponse<SwapResponse[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse[]>>("GET", `/swaps?status=0&version=${LayerSwapApiClient.apiVersion}`);
    }

    async CancelSwapAsync(swapid: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/swaps/${swapid}`);
    }

    async DisconnectExchangeAsync(swapid: string, exchangeName: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/swaps/${swapid}/exchange/${exchangeName}/disconnect`);
    }

    async GetSwapDetailsAsync(id: string): Promise<ApiResponse<SwapResponse>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("GET", `/swaps/${id}?version=${LayerSwapApiClient.apiVersion}`);
    }

    async GetDepositAddress(network: string, source: DepositAddressSource): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<DepositAddress>>("GET", `/swaps?network=${network}&source=${source}`);
    }

    async GenerateDepositAddress(network: string): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("POST", `/networks/${network}/deposit_addresses`);
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

    private async AuthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api" + endpoint;
        return await this._authInterceptor(uri, { method: method, data: data, headers: { 'Access-Control-Allow-Origin': '*', ...(header ? header : {}) } })
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

export type DepositAddress = {
    type: string
    address: `0x${string}`;
}

export enum DepositAddressSource {
    UserGenerated = 0,
    Managed = 1
}

export type NetworkAccount = {
    id: string,
    address: string,
    note: string,
    network_id: string,
    network: string
}

export type CreateSwapParams = {
    source_network: string,
    source_asset: string,
    destination_network: string,
    destination_asset: string
    refuel?: boolean,
    slippage?: number,
    destination_address: string,
    source_address?: string
    amount: string,
    reference_id?: string,
    source_exchange?: string
    destination_exchange?: string
    deposit_mode: string
    app_name?: string,
}

export type SwapResponse = {
    swap: SwapItem;
    deposit_methods: DepositMethods
    quote: SwapQuote
}

export type SwapItem = {
    id: string,
    created_date: string,
    source_network: SwapNetwork,
    source_token: SwapToken,
    source_exchange?: SwapExchange,
    destination_network: SwapNetwork,
    destination_token: SwapToken,
    destination_exchange?: SwapExchange,
    refuel: {
        token: SwapToken,
        network: SwapNetwork,
        refuel_amount: number
    },
    status: SwapStatus,
    source_address: `0x${string}`,
    destination_address: `0x${string}`,
    requested_amount: number,
    deposit_mode: string
    transactions: Transaction[]
    exchange_account_connected: boolean;
    exchange_account_name?: string;
    fail_reason?: string;
    metadata: {
        reference_id: string | null;
        app: string | null;
        sequence_number: number
    }
}

export type SwapNetwork = {
    name: string,
    display_name: string,
    logo: string,
    chain_id: string
}

export type SwapToken = {
    symbol: string,
    logo: string,
    contract: string,
    decimals: number,
    price_in_usd: number
}

export type SwapExchange = {
    name: string,
    display_name: string,
    logo: string
}

export type DepositMethods = {
    deposit_address: {
        amount: number,
        amount_in_base_units: string,
        base_units: number,
        network: string,
        asset: string,
        chain_id: string,
        deposit_address: string,
        asset_contract_address: string
    },
    wallet: {
        amount: number,
        amount_in_base_units: string,
        base_units: number,
        network: string,
        asset: string,
        chain_id: string,
        to_address: `0x${string}`,
        call_data: string
    }
}

export type SwapQuote = {
    receive_amount: number,
    min_receive_amount: number,
    total_fee: number,
    total_fee_in_usd: number,
    blockchain_fee: number,
    service_fee: number,
    avg_completion_time: string
}

export type AddressBookItem = {
    address: string,
    date: string,
    networks: string[],
    exchanges: string[]
}

export type Transaction = {
    type: TransactionType,
    from: string,
    to: string,
    created_date: string,
    amount: number,
    transaction_hash: string,
    confirmations: number,
    max_confirmations: number,
    usd_value: number,
    usd_price: number,
    status: TransactionStatus,
}

export enum TransactionType {
    Input = 'input',
    Output = 'output',
    Refuel = 'refuel'
}

export enum TransactionStatus {
    Completed = 'completed',
    Initiated = 'initiated',
    Pending = 'pending'
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

export enum SwapStatusInNumbers {
    Pending = 0,
    Completed = 1,
    Failed = 2,
    Expired = 3,
    Delayed = 4,
    Cancelled = 5,
    SwapsWithoutCancelledAndExpired = '0&status=1&status=2&status=4'
}

export type Campaign = {
    id: number,
    name: string,
    display_name: string,
    asset: string,
    network: string,
    percentage: number,
    start_date: string,
    end_date: string,
    min_payout_amount: number,
    total_budget: number,
    distributed_amount: number,
    status: 'active' | 'inactive'
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