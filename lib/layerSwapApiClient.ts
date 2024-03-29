import { SwapStatus } from "../Models/SwapStatus";
import AppSettings from "./AppSettings";
import { InitializeUnauthInstance, InitializeAuthInstance } from "./axiosInterceptor"
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance, Method } from "axios";
import { AuthRefreshFailedError } from "./Errors/AuthRefreshFailedError";
import { ApiResponse, EmptyApiResponse } from "../Models/ApiResponse";
import LayerSwapAuthApiClient from "./userAuthApiClient";
import { CryptoNetwork, Network, Token } from "../Models/Network";
import { Exchange } from "../Models/Exchange";

export default class LayerSwapApiClient {
    static apiBaseEndpoint?: string = AppSettings.LayerswapApiUri;
    static bridgeApiBaseEndpoint?: string = AppSettings.LayerswapBridgeApiUri;

    _authInterceptor: AxiosInstance;
    _unauthInterceptor: AxiosInstance
    constructor() {
        this._authInterceptor = InitializeAuthInstance(LayerSwapAuthApiClient.identityBaseEndpoint);
        this._unauthInterceptor = InitializeUnauthInstance(LayerSwapApiClient.apiBaseEndpoint)
    }

    fetcher = (url: string) => this.AuthenticatedRequest<ApiResponse<any>>("GET", url)

    async GetRoutesAsync(direction: 'sources' | 'destinations'): Promise<ApiResponse<CryptoNetwork[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<CryptoNetwork[]>>("GET", `/${direction}`)
    }

    async GetExchangesAsync(): Promise<ApiResponse<Exchange[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<Exchange[]>>("GET", `/exchanges`);
    }

    async GetLSNetworksAsync(): Promise<ApiResponse<CryptoNetwork[]>> {
        return await this.UnauthenticatedRequest<ApiResponse<CryptoNetwork[]>>("GET", `/networks`);
    }

    async CreateSwapAsync(params: CreateSwapParams): Promise<ApiResponse<SwapResponse>> {
        const correlationId = uuidv4()
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("POST", `/swaps`, params, { 'X-LS-CORRELATION-ID': correlationId });
    }

    async GetSwapsAsync(page: number, status?: SwapStatusInNumbers): Promise<ApiResponse<SwapResponse[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse[]>>("GET", `/swaps?page=${page}${status ? `&status=${status}` : ''}`);
    }

    async GetPendingSwapsAsync(): Promise<ApiResponse<SwapResponse[]>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse[]>>("GET", `/swaps?status=0`);
    }

    async GetQuote({ params }: { params: GetQuoteParams }): Promise<ApiResponse<Quote>> {
        const { source_network, source_token, source_address, destination_address, destination_token, destination_network, amount, deposit_mode, include_gas, refuel } = params
        return await this.AuthenticatedRequest<ApiResponse<Quote>>("GET", `/quote?source_network=${source_network}&source_token=${source_token}&source_address=${source_address}&destination_network=${destination_network}&destination_token=${destination_token}&destination_address=${destination_address}&deposit_mode=${deposit_mode}&include_gas=${include_gas}&amount=${amount}&refuel=${refuel}`);
    }

    async DisconnectExchangeAsync(swapid: string, exchangeName: string): Promise<ApiResponse<void>> {
        return await this.AuthenticatedRequest<ApiResponse<void>>("DELETE", `/swaps/${swapid}/exchange/${exchangeName}/disconnect`);
    }

    async GetSwapDetailsAsync(id: string): Promise<ApiResponse<SwapResponse>> {
        return await this.AuthenticatedRequest<ApiResponse<SwapResponse>>("GET", `/swaps/${id}`);
    }

    async GetDepositAddress(network: string, source: DepositAddressSource): Promise<ApiResponse<DepositAddress>> {
        return await this.AuthenticatedRequest<ApiResponse<DepositAddress>>("GET", `/swaps?network=${network}&source=${source}`);
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

    async GetTransactionStatus(network: string, tx_id: string): Promise<ApiResponse<any>> {
        return await this.AuthenticatedRequest<ApiResponse<any>>("POST", `/networks/${network}/transaction_status`, { transaction_id: tx_id });
    }

    private async AuthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v2-alpha" + endpoint;
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

    private async UnauthenticatedRequest<T extends EmptyApiResponse>(method: Method, endpoint: string, data?: any, header?: {}): Promise<T> {
        let uri = LayerSwapApiClient.apiBaseEndpoint + "/api/v2-alpha" + endpoint;
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

export type DepositAddress = {
    type: string
    address: `0x${string}`;
}

export enum DepositAddressSource {
    UserGenerated = 0,
    Managed = 1
}

export type CreateSwapParams = {
    source_network: string,
    source_token: string,
    destination_network: string,
    destination_token: string
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
    refuel: Refuel,
}

export type Refuel = {
    network: Network
    token: Token,
    amount: number,
    amount_in_usd: number
}

export type SwapItem = {
    id: string,
    created_date: string,
    source_network: Network,
    source_token: Token,
    source_exchange?: Exchange,
    destination_network: Network,
    destination_token: Token,
    destination_exchange?: Exchange,
    status: SwapStatus,
    source_address: `0x${string}`,
    destination_address: `0x${string}`,
    requested_amount: number,
    deposit_mode: "deposit_address" | "wallet"
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

export type Quote = {
    quote: SwapQuote,
    refuel: Refuel,
}

export type GetQuoteParams = {
    source_network: string,
    source_token: string,
    source_address?: string,
    destination_network: string,
    destination_token: string,
    destination_address: string,
    deposit_mode: string,
    include_gas?: boolean,
    amount: number,
    refuel?: boolean
}

export type SwapQuote = {
    receive_amount: number,
    min_receive_amount: number,
    total_fee: number,
    total_fee_in_usd: number,
    blockchain_fee: number,
    deposit_gas_fee: number,
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
    status: BackendTransactionStatus,
}

export enum TransactionType {
    Input = 'input',
    Output = 'output',
    Refuel = 'refuel'
}

export enum BackendTransactionStatus {
    Completed = 'completed',
    Failed = 'failed',
    Initiated = 'initiated',
    Pending = 'pending'
}

export enum TransactionStatus {
    Completed = 'completed',
    Failed = 'failed',
    Pending = 'pending'
}

export enum DepositType {
    Manual = 'manual',
    Wallet = 'wallet'
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

export type PublishedSwapTransactions = {
    [key: string]: SwapTransaction
}


export type SwapTransaction = {
    hash: string,
    status: BackendTransactionStatus
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